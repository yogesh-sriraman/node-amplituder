const YAML = require('yamljs');

const CONF = YAML.load('/etc/node/amplitude.conf');

module.exports = {
  anaFilePath: '/u/node/logs/amp-analytics.log',
  lastLineReadPath: '/u/node/logs/amp-last-line-read.log',
  apiKey: CONF.api_key,
  failFile: '/u/node/logs/amp-failed-events.log',
  logFile: '/u/node/logs/amplitude.log',
  errLogFile: '/u/node/logs/amplitude-error.log',
  maxRetryCount: 3,
  batchLimit: CONF.batch_limit || 10
};
