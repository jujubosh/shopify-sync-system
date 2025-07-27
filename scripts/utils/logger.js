const fs = require('fs');
const path = require('path');
const { EmailNotifier } = require('./email-notifier');

class Logger {
  constructor(retailerId = 'global', config = null) {
    this.retailerId = retailerId;
    this.config = config;
    this.logsDir = path.join(process.cwd(), 'logs');
    this.retailerLogsDir = path.join(this.logsDir, 'retailer-specific');
    this.emailNotifier = config ? new EmailNotifier(config) : null;
    
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    if (!fs.existsSync(this.retailerLogsDir)) {
      fs.mkdirSync(this.retailerLogsDir, { recursive: true });
    }
  }

  logError(message, type = 'error', error = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    const globalLogFile = path.join(this.logsDir, `${type}-errors.log`);
    fs.appendFileSync(globalLogFile, logMessage);
    if (this.retailerId !== 'global') {
      const retailerLogFile = path.join(this.retailerLogsDir, `${this.retailerId}-${type}.log`);
      fs.appendFileSync(retailerLogFile, logMessage);
    }
    
    // Send email notification for errors if enabled
    if (this.emailNotifier && this.config?.emailNotifications?.sendErrors && error) {
      this.emailNotifier.sendErrorNotification(error, {
        retailer: this.retailerId,
        message: message,
        type: type
      }).catch(emailError => {
        console.error('Failed to send error email:', emailError);
      });
    }
  }

  logInfo(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.retailerId}] ${message}`);
  }
}

module.exports = { Logger }; 