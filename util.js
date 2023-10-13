const config = require('./config');

const util = () => {
  const isLoggingRequired = (count, error) => {
    return (
      count > config.maxRetryCount - 1 ||
      error.response.status === 400 ||
      error.response.status === 404
    );
  };

  return {
    isLoggingRequired
  };
};

module.exports = util;
