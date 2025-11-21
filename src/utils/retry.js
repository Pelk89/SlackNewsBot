const pRetry = require('p-retry').default || require('p-retry');

/**
 * Retry Utility
 * Provides intelligent retry logic with exponential backoff for HTTP requests
 */

class RetryError extends Error {
  constructor(message, statusCode, isRetryable) {
    super(message);
    this.name = 'RetryError';
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
  }
}

/**
 * Classifies HTTP errors as retryable or permanent
 * @param {Error} error - The error to classify
 * @returns {boolean} - True if error is retryable
 */
function isRetryableError(error) {
  // Network errors (no response)
  if (!error.response && !error.statusCode) {
    // ECONNREFUSED, ETIMEDOUT, ENOTFOUND, etc.
    if (error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED') {
      return true;
    }
  }

  const statusCode = error.response?.status || error.statusCode;

  if (!statusCode) {
    // Unknown error, allow retry
    return true;
  }

  // 429 Too Many Requests - DO NOT retry (rate limiting)
  if (statusCode === 429) {
    return false;
  }

  // 4xx errors (except 408, 429) - permanent failures, don't retry
  if (statusCode >= 400 && statusCode < 500) {
    // 408 Request Timeout is retryable
    if (statusCode === 408) {
      return true;
    }
    return false;
  }

  // 5xx errors - server errors, should retry
  if (statusCode >= 500) {
    return true;
  }

  // Default to not retryable for unknown status codes
  return false;
}

/**
 * Retry wrapper with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.retries - Maximum number of retry attempts (default: 3)
 * @param {number} options.minTimeout - Minimum timeout in ms (default: 1000)
 * @param {number} options.maxTimeout - Maximum timeout in ms (default: 30000)
 * @param {number} options.factor - Exponential backoff factor (default: 2)
 * @param {Function} options.onRetry - Callback function called on each retry
 * @param {string} options.operationName - Name of operation for logging
 * @returns {Promise<any>} - Result of the function
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    retries = parseInt(process.env.RETRY_ATTEMPTS || '3'),
    minTimeout = parseInt(process.env.RETRY_BASE_DELAY || '1000'),
    maxTimeout = 30000,
    factor = 2,
    onRetry = null,
    operationName = 'operation'
  } = options;

  return pRetry(
    async (attemptNumber) => {
      try {
        return await fn();
      } catch (error) {
        const retryable = isRetryableError(error);
        const statusCode = error.response?.status || error.statusCode || 'N/A';

        if (!retryable) {
          // Permanent error - don't retry
          console.error(`❌ ${operationName} failed with permanent error (status: ${statusCode}):`, error.message);
          throw new pRetry.AbortError(error);
        }

        // Transient error - will retry
        if (onRetry) {
          onRetry(error, attemptNumber);
        }

        console.warn(`⚠️  ${operationName} failed (attempt ${attemptNumber}/${retries + 1}, status: ${statusCode}):`, error.message);
        throw error;
      }
    },
    {
      retries,
      minTimeout,
      maxTimeout,
      factor,
      onFailedAttempt: (error) => {
        const attemptsLeft = retries - error.attemptNumber + 1;
        if (attemptsLeft > 0) {
          console.log(`   ↻ Retrying in ${error.retriesLeft > 0 ? Math.min(minTimeout * Math.pow(factor, error.attemptNumber - 1), maxTimeout) : 0}ms... (${attemptsLeft} attempts left)`);
        }
      }
    }
  );
}

/**
 * Creates a fetch wrapper with timeout support using AbortController
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Function} - Fetch wrapper function
 */
function createFetchWithTimeout(timeout = parseInt(process.env.HTTP_TIMEOUT || '30000')) {
  return async (url, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  };
}

/**
 * Wraps rss-parser parseURL with retry and timeout
 * @param {Object} parser - RSS parser instance
 * @param {string} url - RSS feed URL
 * @param {Object} options - Retry options
 * @returns {Promise<Object>} - Parsed RSS feed
 */
async function parseRSSWithRetry(parser, url, options = {}) {
  const {
    timeout = 20000,
    retries = 1,
    operationName = `RSS feed: ${url}`
  } = options;

  return retryWithBackoff(
    async () => {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`RSS parsing timeout after ${timeout}ms`)), timeout);
      });

      // Race between parsing and timeout
      const feed = await Promise.race([
        parser.parseURL(url),
        timeoutPromise
      ]);

      return feed;
    },
    {
      retries,
      operationName,
      minTimeout: 2000, // 2s delay between RSS retries
      maxTimeout: 5000
    }
  );
}

module.exports = {
  retryWithBackoff,
  isRetryableError,
  createFetchWithTimeout,
  parseRSSWithRetry,
  RetryError
};
