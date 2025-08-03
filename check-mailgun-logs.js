const https = require('https');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (require('fs').existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('✅ Loaded environment variables from .env.local');
}

async function checkMailgunLogs() {
    console.log('🔍 Checking Mailgun logs for recent emails...');
    
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    
    if (!apiKey || !domain) {
        console.error('❌ Missing Mailgun credentials');
        return;
    }
    
    console.log(`📧 Domain: ${domain}`);
    console.log(`🔑 API Key: ${apiKey ? 'SET' : 'NOT SET'}`);
    
    // Get events from the last hour
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const beginTime = oneHourAgo.toISOString();
    const endTime = now.toISOString();
    
    const queryParams = new URLSearchParams({
        'begin': beginTime,
        'end': endTime,
        'limit': 10
    });
    
    const options = {
        hostname: 'api.mailgun.net',
        port: 443,
        path: `/v3/${domain}/events?${queryParams.toString()}`,
        method: 'GET',
        headers: {
            'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
            'Content-Type': 'application/json'
        }
    };
    
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const events = JSON.parse(data);
                        console.log('\n📊 Recent Mailgun Events:');
                        console.log(`Total events: ${events.items?.length || 0}`);
                        
                        if (events.items && events.items.length > 0) {
                            events.items.forEach((event, index) => {
                                console.log(`\n${index + 1}. Event: ${event.event}`);
                                console.log(`   Time: ${event.timestamp}`);
                                console.log(`   Recipient: ${event.recipient}`);
                                console.log(`   Message ID: ${event.message?.headers?.['message-id'] || 'N/A'}`);
                                if (event.delivery?.code) {
                                    console.log(`   Delivery Code: ${event.delivery.code}`);
                                    console.log(`   Delivery Message: ${event.delivery.message}`);
                                }
                            });
                        } else {
                            console.log('No recent events found');
                        }
                        
                        resolve(events);
                    } catch (error) {
                        console.error('❌ Error parsing response:', error.message);
                        console.log('Raw response:', data);
                        reject(error);
                    }
                } else {
                    console.error(`❌ Mailgun API error: ${res.statusCode}`);
                    console.log('Response:', data);
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Request error:', error.message);
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

checkMailgunLogs().catch(console.error); 