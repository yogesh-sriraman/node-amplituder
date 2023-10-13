const fs = require('fs');
const axiosRetry = require('axios-retry');
const axios = require('axios');
const Tail = require('tail').Tail;
const program = require('commander');

const config = require('./config');
const logger = require('./logger');

let lastLineRead;
let retryCount = 0;
let canBeProcessedFlag = false;

program
  .version('2.19.0')
  .option(
    '-f, --anaFilePath [value]',
    'Provide event data file name',
    config.anaFilePath
  )
  .parse(process.argv);

const { anaFilePath } = program;

logger.info('BATCH PROCESS');
logger.info('ANA FILE PATH: ', { data: anaFilePath });
logger.info('BATCH LIMIT: ', { data: config.batchLimit });

const makeHttpPost = events => {
  axiosRetry(axios, { retries: config.maxRetryCount - 1 });
  axiosRetry(axios, {
    retryCondition: axiosRetry.isAnyError,
    retryCondition: response => {
      retryCount++;
    }
  });

  const postData = {
    api_key: config.apiKey,
    events
  };

  axios
    .post('https://api.amplitude.com/batch', postData)
    .then(response => {
      logger.info('Response code from server: ', { data: response.data.code });
    })
    .catch(error => {
      logger.error('Error response from amplitude: ', { data: error });
      if (isLoggingRequired(retryCount, error)) {
        logger.info('Retry limit reached...writing to failed events log');
        const dt = new Date().toUTCString();
        const stCode = error.response.status;
        events.map(event => {
          // TODO: move this to util
          const failEventLog =
            dt + '\t' + stCode.toString() + '\t' + JSON.stringify(event);
          fs.appendFileSync(config.failFile, failEventLog + '\n');
        });

        retryCount = 0;
      }
    });
};

// TODO: move this to util
// Find out if the event has to be logged to failed events log file
const isLoggingRequired = (count, error) => {
  return (
    count > config.maxRetryCount - 1 ||
    error.response.status === 400 ||
    error.response.status === 404
  );
};

// TODO: move this to util
const canBeProcessed = currLine => {
  if (canBeProcessedFlag) return true;

  // Read the last line processed or create an empty file if
  // it does not exist
  fs.appendFileSync(config.lastLineReadPath, '');
  lastLineRead = fs.readFileSync(config.lastLineReadPath, 'utf8');

  if (!lastLineRead.toString()) {
    // Last line read not present, start processing from beginning
    return (canBeProcessedFlag = true);
  }

  if (lastLineRead.toString().trim() === currLine.trim()) {
    //The match is found. But the processing should start from next line
    canBeProcessedFlag = true;
  }

  return false;
};

let batchSize = 0;
let events = [];
const processLine = currLine => {
  if (!canBeProcessed(currLine)) return;

  batchSize++;

  let params = currLine
    .toString()
    .split('\t')
    .pop();
  params = JSON.parse(params);

  events.push(params);
  if (batchSize === config.batchLimit) {
    makeHttpPost(events);
    batchSize = 0;
    events = [];
  }

  // TODO: move this to util
  fs.writeFileSync(config.lastLineReadPath, `${currLine}\n`);
};

const startProcessing = () => {
  const options = {
    fromBeginning: true,
    follow: true,
    useWatchFile: true,
    logger: console
  };
  const tail = new Tail(anaFilePath, options);

  // Start the processing line-by-line.
  // Wait for new events after the entire contents are processed
  tail.on('line', line => {
    processLine(line);
  });
};

// Below line calls the function to process the lines in a log file
startProcessing();
