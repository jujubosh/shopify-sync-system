const fs = require('fs');
const path = require('path');
const { OrderProcessor } = require('./utils/order-processor');

function loadConfig() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '../config/global-config.json'), 'utf8'));
}

function loadRetailers() {
  const retailersDir = path.join(__dirname, '../config/retailers');
  const files = fs.readdirSync(retailersDir).filter(f => f.endsWith('.json'));
  return files.map(file => {
    const retailer = JSON.parse(fs.readFileSync(path.join(retailersDir, file), 'utf8'));
    retailer.id = file.replace('.json', '');
    return retailer;
  });
}

async function importOrdersForAllRetailers() {
  const config = loadConfig();
  let retailers = loadRetailers();
  if (process.env.RETAILER_ID) {
    retailers = retailers.filter(r => r.id === process.env.RETAILER_ID);
  }
  for (const retailer of retailers) {
    if (!retailer.settings.enabled || !retailer.settings.importOrders) {
      console.log(`Skipping ${retailer.name}: disabled or import disabled`);
      continue;
    }
    try {
      const processor = new OrderProcessor(retailer, config);
      await processor.processOrders();
    } catch (error) {
      console.error(`Failed to process ${retailer.name}:`, error);
    }
  }
}

importOrdersForAllRetailers().catch(console.error); 