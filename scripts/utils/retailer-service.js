const { DatabaseService } = require('./database-service');

class RetailerService {
  constructor() {
    this.dbService = new DatabaseService();
  }

  async loadRetailers() {
    try {
      const retailers = await this.dbService.getRetailers();
      
      // Transform database format back to the expected format for existing processors
      return retailers.map(retailer => this.transformDbToConfig(retailer));
    } catch (error) {
      console.error('Failed to load retailers from database:', error);
      throw error;
    }
  }

  async loadRetailerById(id) {
    try {
      const retailer = await this.dbService.getRetailerById(id);
      if (!retailer) {
        throw new Error(`Retailer with ID '${id}' not found`);
      }
      return this.transformDbToConfig(retailer);
    } catch (error) {
      console.error(`Failed to load retailer ${id}:`, error);
      throw error;
    }
  }

  async loadRetailerByDomain(domain) {
    try {
      const retailer = await this.dbService.getRetailerByDomain(domain);
      if (!retailer) {
        throw new Error(`Retailer with domain '${domain}' not found`);
      }
      return this.transformDbToConfig(retailer);
    } catch (error) {
      console.error(`Failed to load retailer by domain ${domain}:`, error);
      throw error;
    }
  }

  transformDbToConfig(dbRetailer) {
    // Transform database format back to the expected config format
    const config = {
      id: dbRetailer.id,
      name: dbRetailer.name,
      domain: dbRetailer.domain,
      apiToken: dbRetailer.api_token,
      targetLocationId: dbRetailer.target_location_id,
      lglLocationId: dbRetailer.lgl_location_id || dbRetailer.target_location_id, // For backward compatibility
      settings: {
        enabled: dbRetailer.enabled ?? true,
        importOrders: dbRetailer.import_orders ?? true,
        pushFulfillments: dbRetailer.push_fulfillments ?? true,
        syncInventory: dbRetailer.sync_inventory ?? false,
        lookbackHours: dbRetailer.lookback_hours ?? 6,
        fulfillmentLookbackHours: dbRetailer.fulfillment_lookback_hours ?? 24,
        customFields: {
          includeNote: dbRetailer.custom_include_note ?? false,
          includeTags: dbRetailer.custom_include_tags ?? false
        }
      },
      billingAddress: {
        email: dbRetailer.billing_email,
        firstName: dbRetailer.billing_first_name,
        lastName: dbRetailer.billing_last_name,
        phone: dbRetailer.billing_phone,
        address1: dbRetailer.billing_address1,
        address2: dbRetailer.billing_address2,
        city: dbRetailer.billing_city,
        province: dbRetailer.billing_province,
        zip: dbRetailer.billing_zip,
        country: dbRetailer.billing_country
      }
    };

    return config;
  }

  async updateRetailerSettings(retailerId, settings) {
    try {
      const updates = {
        settings: {
          ...settings,
          updated_at: new Date().toISOString()
        }
      };
      
      return await this.dbService.updateRetailer(retailerId, updates);
    } catch (error) {
      console.error(`Failed to update retailer settings for ${retailerId}:`, error);
      throw error;
    }
  }

  async enableRetailer(retailerId) {
    return this.updateRetailerSettings(retailerId, { enabled: true });
  }

  async disableRetailer(retailerId) {
    return this.updateRetailerSettings(retailerId, { enabled: false });
  }

  async getRetailerStats() {
    try {
      const retailers = await this.dbService.getRetailers();
      return {
        total: retailers.length,
        enabled: retailers.filter(r => r.settings?.enabled).length,
        disabled: retailers.filter(r => !r.settings?.enabled).length,
        withOrderImport: retailers.filter(r => r.settings?.import_orders).length,
        withFulfillmentPush: retailers.filter(r => r.settings?.push_fulfillments).length,
        withInventorySync: retailers.filter(r => r.settings?.sync_inventory).length
      };
    } catch (error) {
      console.error('Failed to get retailer stats:', error);
      throw error;
    }
  }
}

module.exports = { RetailerService }; 