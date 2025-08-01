#!/usr/bin/env node

const { spawn } = require('child_process');

// Get the command to run from command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node run-test.js <command> [args...]');
  console.log('');
  console.log('Examples:');
  console.log('  node run-test.js node scripts/process-all.js');
  console.log('  node run-test.js node do-import-orders.js');
  console.log('  node run-test.js node scripts/test-email-notifications.js');
  process.exit(1);
}

// Set the TEST_CONFIG environment variable
process.env.TEST_CONFIG = 'true';

console.log('🔧 Running in TEST mode with global-config-test.json');
console.log(`📋 Command: ${args.join(' ')}`);
console.log('');

// Spawn the child process with the test environment
const child = spawn(args[0], args.slice(1), {
  stdio: 'inherit',
  env: process.env
});

child.on('close', (code) => {
  console.log('');
  console.log(`✅ Test command completed with exit code: ${code}`);
  process.exit(code);
});

child.on('error', (error) => {
  console.error('❌ Failed to start test command:', error.message);
  process.exit(1);
}); 