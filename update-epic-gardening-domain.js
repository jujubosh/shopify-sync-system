const { DatabaseService } = require('./scripts/utils/database-service');

async function updateEpicGardeningDomain() {
  const dbService = new DatabaseService();
  
  try {
    console.log('Updating Epic Gardening domain in database...');
    
    // Find Epic Gardening by ID
    const retailerId = 'epic-gardening-1754265556188';
    
    // Update the domain
    const updates = {
      domain: 'epic-gardening.myshopify.com',
      updated_at: new Date().toISOString()
    };
    
    const result = await dbService.updateRetailer(retailerId, updates);
    console.log('✅ Updated Epic Gardening domain to:', result.domain);
    
    // Verify the update
    const updatedRetailer = await dbService.getRetailerById(retailerId);
    console.log('✅ Verification - Updated retailer:', {
      id: updatedRetailer.id,
      name: updatedRetailer.name,
      domain: updatedRetailer.domain
    });
    
  } catch (error) {
    console.error('❌ Error updating Epic Gardening domain:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  updateEpicGardeningDomain();
}

module.exports = { updateEpicGardeningDomain }; 