const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (require('fs').existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('✅ Loaded environment variables from .env.local');
} else {
    console.log('❌ .env.local file not found');
    process.exit(1);
}

const { DatabaseEmailNotifier } = require('./scripts/utils/database-email-notifier');

async function testEmailLocal() {
    console.log('🧪 Testing email functionality with local environment...');
    
    // Check environment variables
    console.log('\n📋 Environment Variables:');
    console.log(`MAILGUN_API_KEY: ${process.env.MAILGUN_API_KEY ? 'SET' : 'NOT SET'}`);
    console.log(`MAILGUN_DOMAIN: ${process.env.MAILGUN_DOMAIN || 'NOT SET'}`);
    console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM || 'NOT SET'}`);
    console.log(`EMAIL_TO: ${process.env.EMAIL_TO || 'NOT SET'}`);
    
    // Load config
    const config = require('./config/global-config.json');
    console.log('\n📋 Email Config:');
    console.log(`Email enabled: ${config.emailNotifications.enabled}`);
    console.log(`Send inventory alerts: ${config.emailNotifications.sendInventoryAlerts}`);
    console.log(`Send errors: ${config.emailNotifications.sendErrors}`);
    
    try {
        const emailNotifier = new DatabaseEmailNotifier(config);
        console.log('\n✅ Email notifier initialized successfully');
        
        // Test inventory alert
        console.log('\n📧 Testing inventory alert email...');
        const mockResults = {
            inventory: {
                total: 50,
                successfulUpdates: 45,
                locationMismatches: 3,
                failures: 2,
                details: {
                    successfulUpdates: [
                        { retailer: 'Nationwide Plants', sku: 'TEST-SKU-001' }
                    ],
                    locationMismatches: [
                        { 
                            retailer: 'Nationwide Plants', 
                            sku: 'TEST-SKU-002',
                            expectedLocation: 'Main Warehouse',
                            actualLocation: 'Secondary Location'
                        }
                    ],
                    failures: [
                        { 
                            retailer: 'Nationwide Plants', 
                            sku: 'TEST-SKU-003',
                            error: 'Test error message'
                        }
                    ]
                }
            }
        };
        
        await emailNotifier.sendInventoryAlert(mockResults);
        console.log('✅ Inventory alert email sent successfully!');
        
        // Test error notification
        console.log('\n📧 Testing error notification email...');
        await emailNotifier.sendErrorNotification(
            new Error('Test error for email verification'),
            {
                operation: 'inventory',
                retailer: 'Nationwide Plants'
            }
        );
        console.log('✅ Error notification email sent successfully!');
        
        console.log('\n🎉 All email tests completed successfully!');
        console.log('📧 Check your inbox for test emails.');
        
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

testEmailLocal().catch(console.error); 