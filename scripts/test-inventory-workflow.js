const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Testing Inventory Workflow...\n');

// Test 1: Run inventory sync for all retailers
console.log('1️⃣ Testing inventory sync for all retailers...');
try {
  const result = execSync('node scripts/process-inventory.js', { 
    encoding: 'utf8',
    cwd: path.join(__dirname, '..')
  });
  console.log('✅ All retailers test passed');
  console.log('Output:', result);
} catch (error) {
  console.log('❌ All retailers test failed:', error.message);
}

console.log('\n2️⃣ Testing inventory sync for specific retailer...');
try {
  const result = execSync('RETAILER_ID=nationwide-plants node scripts/process-inventory.js', { 
    encoding: 'utf8',
    cwd: path.join(__dirname, '..')
  });
  console.log('✅ Specific retailer test passed');
  console.log('Output:', result);
} catch (error) {
  console.log('❌ Specific retailer test failed:', error.message);
}

console.log('\n3️⃣ Testing with invalid retailer ID...');
try {
  const result = execSync('RETAILER_ID=invalid-retailer node scripts/process-inventory.js', { 
    encoding: 'utf8',
    cwd: path.join(__dirname, '..')
  });
  console.log('❌ Invalid retailer test should have failed but passed');
} catch (error) {
  console.log('✅ Invalid retailer test correctly failed as expected');
  console.log('Error:', error.message);
}

console.log('\n🎉 Inventory workflow tests completed!'); 