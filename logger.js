const { createLogger, format, transports } = require('winston');

const config = require('./config');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.colorize(),
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.printf(info => {
      const data = info.data === undefined ? '' : info.data;
      return `${info.timestamp} ${info.level}: ${info.message} ${data}`;
    })
  ),
  transports: [
    new transports.File({
      filename: config.errLogFile,
      level: 'error'
    }),
    new transports.File({ filename: config.logFile })
  ]
});

module.exports = logger;
