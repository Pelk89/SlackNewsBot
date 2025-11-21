/**
 * Circuit Breaker
 * Prevents cascading failures by tracking source reliability and temporarily disabling failing sources
 */

class CircuitBreaker {
  constructor(options = {}) {
    this.threshold = parseFloat(process.env.CIRCUIT_BREAKER_THRESHOLD || options.threshold || 0.5);
    this.timeout = parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || options.timeout || 900000); // 15 minutes
    this.windowSize = options.windowSize || 10; // Track last N attempts

    // Map of source ID to circuit state
    this.circuits = new Map();
  }

  /**
   * Gets or creates circuit state for a source
   * @param {string} sourceId - Unique source identifier
   * @returns {Object} - Circuit state
   */
  getCircuit(sourceId) {
    if (!this.circuits.has(sourceId)) {
      this.circuits.set(sourceId, {
        state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
        failures: 0,
        successes: 0,
        attempts: [],
        lastFailureTime: null,
        lastSuccessTime: null
      });
    }
    return this.circuits.get(sourceId);
  }

  /**
   * Checks if a request should be allowed through the circuit breaker
   * @param {string} sourceId - Unique source identifier
   * @returns {boolean} - True if request should proceed
   */
  allowRequest(sourceId) {
    const circuit = this.getCircuit(sourceId);

    // If circuit is CLOSED, allow all requests
    if (circuit.state === 'CLOSED') {
      return true;
    }

    // If circuit is OPEN, check if timeout has passed
    if (circuit.state === 'OPEN') {
      const timeSinceFailure = Date.now() - circuit.lastFailureTime;

      if (timeSinceFailure >= this.timeout) {
        // Transition to HALF_OPEN state
        circuit.state = 'HALF_OPEN';
        console.log(`🔄 Circuit breaker for "${sourceId}" entering HALF_OPEN state (attempting recovery)`);
        return true;
      }

      // Circuit still open, reject request
      return false;
    }

    // If HALF_OPEN, allow limited requests to test recovery
    if (circuit.state === 'HALF_OPEN') {
      return true;
    }

    return false;
  }

  /**
   * Records a successful request
   * @param {string} sourceId - Unique source identifier
   */
  recordSuccess(sourceId) {
    const circuit = this.getCircuit(sourceId);

    circuit.successes++;
    circuit.lastSuccessTime = Date.now();
    circuit.attempts.push({ success: true, timestamp: Date.now() });

    // Trim attempts to window size
    if (circuit.attempts.length > this.windowSize) {
      circuit.attempts.shift();
    }

    // If in HALF_OPEN state and success, close the circuit
    if (circuit.state === 'HALF_OPEN') {
      circuit.state = 'CLOSED';
      circuit.failures = 0; // Reset failure count
      console.log(`✅ Circuit breaker for "${sourceId}" CLOSED (source recovered)`);
    }

    // Check if we should close an OPEN circuit based on success pattern
    if (circuit.state === 'OPEN') {
      const failureRate = this.calculateFailureRate(sourceId);
      if (failureRate < this.threshold) {
        circuit.state = 'CLOSED';
        console.log(`✅ Circuit breaker for "${sourceId}" CLOSED (failure rate normalized)`);
      }
    }
  }

  /**
   * Records a failed request
   * @param {string} sourceId - Unique source identifier
   * @param {Error} error - The error that occurred
   */
  recordFailure(sourceId, error = null) {
    const circuit = this.getCircuit(sourceId);

    circuit.failures++;
    circuit.lastFailureTime = Date.now();
    circuit.attempts.push({ success: false, timestamp: Date.now(), error: error?.message });

    // Trim attempts to window size
    if (circuit.attempts.length > this.windowSize) {
      circuit.attempts.shift();
    }

    const failureRate = this.calculateFailureRate(sourceId);

    // If in HALF_OPEN state and failure, reopen the circuit
    if (circuit.state === 'HALF_OPEN') {
      circuit.state = 'OPEN';
      console.error(`⛔ Circuit breaker for "${sourceId}" reopened OPEN (recovery failed)`);
      return;
    }

    // Check if we should open the circuit
    if (circuit.state === 'CLOSED' && failureRate >= this.threshold && circuit.attempts.length >= 3) {
      circuit.state = 'OPEN';
      const timeoutMinutes = Math.round(this.timeout / 60000);
      console.error(`⛔ Circuit breaker for "${sourceId}" OPENED (failure rate: ${(failureRate * 100).toFixed(1)}% >= ${(this.threshold * 100).toFixed(0)}%). Source disabled for ${timeoutMinutes} minutes.`);
    }
  }

  /**
   * Calculates the current failure rate for a source
   * @param {string} sourceId - Unique source identifier
   * @returns {number} - Failure rate (0-1)
   */
  calculateFailureRate(sourceId) {
    const circuit = this.getCircuit(sourceId);

    if (circuit.attempts.length === 0) {
      return 0;
    }

    const failures = circuit.attempts.filter(a => !a.success).length;
    return failures / circuit.attempts.length;
  }

  /**
   * Gets the current state of a circuit
   * @param {string} sourceId - Unique source identifier
   * @returns {string} - Circuit state (CLOSED, OPEN, HALF_OPEN)
   */
  getState(sourceId) {
    return this.getCircuit(sourceId).state;
  }

  /**
   * Gets statistics for a source
   * @param {string} sourceId - Unique source identifier
   * @returns {Object} - Circuit statistics
   */
  getStats(sourceId) {
    const circuit = this.getCircuit(sourceId);
    const failureRate = this.calculateFailureRate(sourceId);

    return {
      state: circuit.state,
      failures: circuit.failures,
      successes: circuit.successes,
      failureRate: failureRate,
      failureRatePercent: (failureRate * 100).toFixed(1),
      recentAttempts: circuit.attempts.length,
      lastFailureTime: circuit.lastFailureTime,
      lastSuccessTime: circuit.lastSuccessTime,
      isHealthy: circuit.state === 'CLOSED' && failureRate < this.threshold
    };
  }

  /**
   * Gets statistics for all sources
   * @returns {Object} - Map of source IDs to statistics
   */
  getAllStats() {
    const stats = {};
    for (const [sourceId, _] of this.circuits) {
      stats[sourceId] = this.getStats(sourceId);
    }
    return stats;
  }

  /**
   * Manually resets a circuit to CLOSED state
   * @param {string} sourceId - Unique source identifier
   */
  reset(sourceId) {
    const circuit = this.getCircuit(sourceId);
    circuit.state = 'CLOSED';
    circuit.failures = 0;
    circuit.successes = 0;
    circuit.attempts = [];
    circuit.lastFailureTime = null;
    console.log(`🔄 Circuit breaker for "${sourceId}" manually reset to CLOSED`);
  }

  /**
   * Resets all circuits
   */
  resetAll() {
    for (const [sourceId, _] of this.circuits) {
      this.reset(sourceId);
    }
    console.log('🔄 All circuit breakers reset');
  }
}

// Singleton instance
let circuitBreakerInstance = null;

/**
 * Gets the singleton circuit breaker instance
 * @returns {CircuitBreaker}
 */
function getCircuitBreaker() {
  if (!circuitBreakerInstance) {
    circuitBreakerInstance = new CircuitBreaker();
  }
  return circuitBreakerInstance;
}

module.exports = {
  CircuitBreaker,
  getCircuitBreaker
};
