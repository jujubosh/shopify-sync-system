#!/usr/bin/env node

/**
 * Environment setup script
 * Helps configure Supabase environment variables
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEnvironment() {
  console.log('🔧 Setting up environment variables for Supabase...\n');
  
  console.log('To get your Supabase credentials:');
  console.log('1. Go to https://supabase.com and create a new project');
  console.log('2. Go to Settings > API in your Supabase dashboard');
  console.log('3. Copy the Project URL and anon/public key\n');

  const supabaseUrl = await question('Enter your Supabase Project URL: ');
  const supabaseKey = await question('Enter your Supabase anon/public key: ');
  
  const envContent = `# Supabase Configuration
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${supabaseKey}

# Email Configuration
EMAIL_FROM=admin@livegoodlogistics.com
EMAIL_TO=justin@livegoodlogistics.com

# Shopify Configuration
SHOPIFY_LGL_TOKEN=your_shopify_token_here

# Logging
LOG_LEVEL=info
`;

  const envPath = path.join(__dirname, '../.env');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Environment file created at .env');
    console.log('\nNext steps:');
    console.log('1. Update SHOPIFY_LGL_TOKEN with your actual token');
    console.log('2. Run: node scripts/setup-database.js');
    console.log('3. Run: node scripts/migrate-data.js');
  } catch (error) {
    console.error('❌ Failed to create .env file:', error.message);
  }

  rl.close();
}

// Run the setup if called directly
if (require.main === module) {
  setupEnvironment();
}

module.exports = { setupEnvironment }; 