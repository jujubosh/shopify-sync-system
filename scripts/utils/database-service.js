const { supabase, TABLES, JOB_STATUS, OPERATION_TYPES } = require('../../config/database');

class DatabaseService {
  constructor() {
    this.supabase = supabase;
  }

  // Retailer operations
  async getRetailers() {
    const { data, error } = await this.supabase
      .from(TABLES.RETAILERS)
      .select('*')
      .eq('enabled', true)
      .order('name');

    if (error) {
      throw new Error(`Failed to get retailers: ${error.message}`);
    }

    return data || [];
  }

  async getRetailerById(id) {
    // First try exact match
    let { data, error } = await this.supabase
      .from(TABLES.RETAILERS)
      .select('*')
      .eq('id', id)
      .single();

    // If exact match fails, try to find by base name (before timestamp)
    if (error && error.message.includes('multiple (or no) rows returned')) {
      const { data: data2, error: error2 } = await this.supabase
        .from(TABLES.RETAILERS)
        .select('*')
        .ilike('id', `${id}-%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error2) {
        throw new Error(`Failed to get retailer ${id}: ${error2.message}`);
      }
      data = data2;
    } else if (error) {
      throw new Error(`Failed to get retailer ${id}: ${error.message}`);
    }

    return data;
  }

  async getRetailerByDomain(domain) {
    const { data, error } = await this.supabase
      .from(TABLES.RETAILERS)
      .select('*')
      .eq('domain', domain)
      .single();

    if (error) {
      throw new Error(`Failed to get retailer by domain ${domain}: ${error.message}`);
    }

    return data;
  }

  async createRetailer(retailerData) {
    const { data, error } = await this.supabase
      .from(TABLES.RETAILERS)
      .insert(retailerData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create retailer: ${error.message}`);
    }

    return data;
  }

  async updateRetailer(id, updates) {
    const { data, error } = await this.supabase
      .from(TABLES.RETAILERS)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update retailer ${id}: ${error.message}`);
    }

    return data;
  }

  // Sync job operations
  async createSyncJob(retailerId, operationType) {
    const { data, error } = await this.supabase
      .from(TABLES.SYNC_JOBS)
      .insert({
        retailer_id: retailerId,
        operation_type: operationType,
        status: JOB_STATUS.PENDING
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create sync job: ${error.message}`);
    }

    return data;
  }

  async getPendingJobs(limit = 10) {
    const { data, error } = await this.supabase
      .from(TABLES.SYNC_JOBS)
      .select(`
        *,
        retailers (
          id,
          name,
          domain,
          api_token,
          target_location_id,
          settings
        )
      `)
      .eq('status', JOB_STATUS.PENDING)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get pending jobs: ${error.message}`);
    }

    return data || [];
  }

  async updateJobStatus(jobId, status, results = null, errorMessage = null) {
    const updates = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === JOB_STATUS.RUNNING) {
      updates.started_at = new Date().toISOString();
    } else if (status === JOB_STATUS.COMPLETED || status === JOB_STATUS.FAILED) {
      updates.completed_at = new Date().toISOString();
      if (results) updates.results = results;
      if (errorMessage) updates.error_message = errorMessage;
    }

    const { data, error } = await this.supabase
      .from(TABLES.SYNC_JOBS)
      .update(updates)
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update job ${jobId}: ${error.message}`);
    }

    return data;
  }

  async getJobHistory(retailerId = null, limit = 50) {
    let query = this.supabase
      .from(TABLES.SYNC_JOBS)
      .select(`
        *,
        retailers (
          id,
          name,
          domain
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (retailerId) {
      query = query.eq('retailer_id', retailerId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get job history: ${error.message}`);
    }

    return data || [];
  }

  // Email notification operations
  async logEmailNotification(type, recipient, subject, body, htmlBody = null) {
    const { data, error } = await this.supabase
      .from(TABLES.EMAIL_NOTIFICATIONS)
      .insert({
        type,
        recipient,
        subject,
        body,
        html_body: htmlBody
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log email notification: ${error.message}`);
    }

    return data;
  }

  async getEmailHistory(limit = 50) {
    const { data, error } = await this.supabase
      .from(TABLES.EMAIL_NOTIFICATIONS)
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get email history: ${error.message}`);
    }

    return data || [];
  }

  // Activity logging
  async logActivity(retailerId, operation, success, details = {}, durationMs = null) {
    const { data, error } = await this.supabase
      .from(TABLES.ACTIVITY_LOGS)
      .insert({
        retailer_id: retailerId,
        operation,
        success,
        details,
        duration_ms: durationMs
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log activity: ${error.message}`);
    }

    return data;
  }

  async getActivityHistory(retailerId = null, limit = 100) {
    let query = this.supabase
      .from(TABLES.ACTIVITY_LOGS)
      .select(`
        *,
        retailers (
          id,
          name,
          domain
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (retailerId) {
      query = query.eq('retailer_id', retailerId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get activity history: ${error.message}`);
    }

    return data || [];
  }

  // Statistics and analytics
  async getSystemStats() {
    const stats = {};

    // Get retailer count
    const { count: retailerCount } = await this.supabase
      .from(TABLES.RETAILERS)
      .select('*', { count: 'exact', head: true });

    stats.totalRetailers = retailerCount || 0;

    // Get job statistics
    const { data: jobStats } = await this.supabase
      .from(TABLES.SYNC_JOBS)
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (jobStats) {
      stats.jobsLast24h = jobStats.length;
      stats.jobsByStatus = jobStats.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {});
    }

    // Get email statistics
    const { data: emailStats } = await this.supabase
      .from(TABLES.EMAIL_NOTIFICATIONS)
      .select('type')
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (emailStats) {
      stats.emailsLast24h = emailStats.length;
      stats.emailsByType = emailStats.reduce((acc, email) => {
        acc[email.type] = (acc[email.type] || 0) + 1;
        return acc;
      }, {});
    }

    return stats;
  }

  // Health check
  async healthCheck() {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.RETAILERS)
        .select('count', { count: 'exact', head: true });

      if (error) {
        return { healthy: false, error: error.message };
      }

      return { healthy: true, retailerCount: data || 0 };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

module.exports = { DatabaseService }; 