const fs = require('fs');
const path = require('path');

class Logger {
  constructor(retailerId = 'global') {
    this.retailerId = retailerId;
    this.logsDir = path.join(process.cwd(), 'logs');
    this.retailerLogsDir = path.join(this.logsDir, 'retailer-specific');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    if (!fs.existsSync(this.retailerLogsDir)) {
      fs.mkdirSync(this.retailerLogsDir, { recursive: true });
    }
  }

  logError(message, type = 'error') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    const globalLogFile = path.join(this.logsDir, `${type}-errors.log`);
    fs.appendFileSync(globalLogFile, logMessage);
    if (this.retailerId !== 'global') {
      const retailerLogFile = path.join(this.retailerLogsDir, `${this.retailerId}-${type}.log`);
      fs.appendFileSync(retailerLogFile, logMessage);
    }
  }

  logInfo(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.retailerId}] ${message}`);
  }
}

module.exports = { Logger }; 