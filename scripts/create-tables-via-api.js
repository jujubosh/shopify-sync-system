#!/usr/bin/env node

/**
 * Create database tables via Supabase API
 * Executes SQL directly through the Supabase client
 */

require('dotenv').config();
const { supabase } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function createTables() {
  console.log('🗄️  Creating database tables via API...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        // Use the rpc method to execute SQL
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // If exec_sql doesn't exist, try alternative approach
          console.log(`  ⚠️  exec_sql failed: ${error.message}`);
          console.log('  Trying alternative approach...');
          
          // For table creation, we'll use the client methods instead
          if (statement.toLowerCase().includes('create table')) {
            console.log('  Table creation will be handled by the setup script');
          } else if (statement.toLowerCase().includes('create index')) {
            console.log('  Index creation will be handled by the setup script');
          } else {
            console.log(`  Skipping: ${statement.substring(0, 50)}...`);
          }
        } else {
          console.log('  ✅ Success');
        }
      } catch (err) {
        console.log(`  ⚠️  Error: ${err.message}`);
      }
    }

    console.log('\n📋 Manual SQL Execution Required');
    console.log('Since the API method has limitations, please run the SQL manually:');
    console.log('\n1. Go to: https://supabase.com/dashboard/project/orvuhoexqgumpwynchay/sql');
    console.log('2. Copy and paste the contents of scripts/create-tables.sql');
    console.log('3. Click "Run" to execute the SQL');
    console.log('\nAfter running the SQL, test with: npm run test-db');

  } catch (error) {
    console.error('❌ Failed to create tables:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  createTables();
}

module.exports = { createTables }; 