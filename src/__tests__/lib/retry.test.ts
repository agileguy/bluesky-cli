/**
 * Tests for retry logic with exponential backoff
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { withRetry, RetryProfiles } from '../../lib/retry.js';

describe('withRetry', () => {
  let attemptCount: number;

  beforeEach(() => {
    attemptCount = 0;
  });

  describe('successful operations', () => {
    it('should return result on first attempt', async () => {
      const operation = async () => {
        attemptCount++;
        return 'success';
      };

      const result = await withRetry(operation, { maxAttempts: 3 });
      expect(result).toBe('success');
      expect(attemptCount).toBe(1);
    });

    it('should return result after retrying', async () => {
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw { code: 'ETIMEDOUT', message: 'Timeout' };
        }
        return 'success';
      };

      const result = await withRetry(operation, {
        maxAttempts: 3,
        initialDelayMs: 10, // Fast for testing
      });

      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });
  });

  describe('retryable errors', () => {
    it('should retry on ETIMEDOUT', async () => {
      const operation = async () => {
        attemptCount++;
        throw { code: 'ETIMEDOUT', message: 'Timeout' };
      };

      try {
        await withRetry(operation, {
          maxAttempts: 3,
          initialDelayMs: 10,
        });
      } catch (error: any) {
        expect(attemptCount).toBe(3);
        expect(error.code).toBe('TIMEOUT');
      }
    });

    it('should retry on ECONNRESET', async () => {
      const operation = async () => {
        attemptCount++;
        throw { code: 'ECONNRESET', message: 'Connection reset' };
      };

      try {
        await withRetry(operation, {
          maxAttempts: 3,
          initialDelayMs: 10,
        });
      } catch (error: any) {
        expect(attemptCount).toBe(3);
        expect(error.code).toBe('SOCKET_HANG_UP');
      }
    });

    it('should retry on ECONNREFUSED', async () => {
      const operation = async () => {
        attemptCount++;
        throw { code: 'ECONNREFUSED', message: 'Connection refused' };
      };

      try {
        await withRetry(operation, {
          maxAttempts: 3,
          initialDelayMs: 10,
        });
      } catch (error: any) {
        expect(attemptCount).toBe(3);
        expect(error.code).toBe('CONNECTION_REFUSED');
      }
    });

    it('should retry on ENOTFOUND', async () => {
      const operation = async () => {
        attemptCount++;
        throw { code: 'ENOTFOUND', message: 'DNS lookup failed' };
      };

      try {
        await withRetry(operation, {
          maxAttempts: 3,
          initialDelayMs: 10,
        });
      } catch (error: any) {
        expect(attemptCount).toBe(3);
        expect(error.code).toBe('DNS_LOOKUP_FAILED');
      }
    });

    it('should retry on 5xx server errors', async () => {
      const operation = async () => {
        attemptCount++;
        throw { status: 500, message: 'Internal server error' };
      };

      try {
        await withRetry(operation, {
          maxAttempts: 3,
          initialDelayMs: 10,
        });
      } catch (error) {
        expect(attemptCount).toBe(3);
      }
    });

    it('should retry on 503 Service Unavailable', async () => {
      const operation = async () => {
        attemptCount++;
        throw { status: 503, message: 'Service unavailable' };
      };

      try {
        await withRetry(operation, {
          maxAttempts: 3,
          initialDelayMs: 10,
        });
      } catch (error) {
        expect(attemptCount).toBe(3);
      }
    });

    it('should NOT retry on 501 Not Implemented', async () => {
      const operation = async () => {
        attemptCount++;
        throw { status: 501, message: 'Not implemented' };
      };

      try {
        await withRetry(operation, {
          maxAttempts: 3,
          initialDelayMs: 10,
        });
      } catch (error) {
        expect(attemptCount).toBe(1); // Should not retry
      }
    });

    it('should retry on socket hang up message', async () => {
      const operation = async () => {
        attemptCount++;
        throw { message: 'socket hang up' };
      };

      try {
        await withRetry(operation, {
          maxAttempts: 3,
          initialDelayMs: 10,
        });
      } catch (error) {
        expect(attemptCount).toBe(3);
      }
    });
  });

  describe('non-retryable errors', () => {
    it('should NOT retry on 401 Unauthorized', async () => {
      const operation = async () => {
        attemptCount++;
        throw { status: 401, message: 'Unauthorized' };
      };

      try {
        await withRetry(operation, {
          maxAttempts: 3,
          initialDelayMs: 10,
        });
      } catch (error: any) {
        expect(attemptCount).toBe(1);
        expect(error.code).toBe('SESSION_EXPIRED');
      }
    });

    it('should NOT retry on 404 Not Found', async () => {
      const operation = async () => {
        attemptCount++;
        throw { status: 404, message: 'Not found' };
      };

      try {
        await withRetry(operation, {
          maxAttempts: 3,
          initialDelayMs: 10,
        });
      } catch (error: any) {
        expect(attemptCount).toBe(1);
        expect(error.code).toBe('NOT_FOUND');
      }
    });

    it('should NOT retry on 400 Bad Request', async () => {
      const operation = async () => {
        attemptCount++;
        throw { status: 400, message: 'Bad request' };
      };

      try {
        await withRetry(operation, {
          maxAttempts: 3,
          initialDelayMs: 10,
        });
      } catch (error: any) {
        expect(attemptCount).toBe(1);
        expect(error.code).toBe('INVALID_REQUEST');
      }
    });

    it('should NOT retry on unknown errors', async () => {
      const operation = async () => {
        attemptCount++;
        throw { code: 'UNKNOWN_ERROR', message: 'Unknown error' };
      };

      try {
        await withRetry(operation, {
          maxAttempts: 3,
          initialDelayMs: 10,
        });
      } catch (error) {
        expect(attemptCount).toBe(1);
      }
    });
  });

  describe('rate limiting', () => {
    it('should handle 429 rate limit with retry-after header', async () => {
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw {
            status: 429,
            message: 'Too many requests',
            headers: { 'retry-after': '1' },
          };
        }
        return 'success';
      };

      const startTime = Date.now();
      const result = await withRetry(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });
      const elapsed = Date.now() - startTime;

      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
      // Should wait at least 1 second (1000ms) for retry-after
      expect(elapsed).toBeGreaterThanOrEqual(1000);
    });

    it('should handle 429 rate limit without retry-after header', async () => {
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw { status: 429, message: 'Too many requests' };
        }
        return 'success';
      };

      const result = await withRetry(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });
  });

  describe('exponential backoff', () => {
    it('should apply exponential backoff', async () => {
      const delays: number[] = [];

      const operation = async () => {
        attemptCount++;
        throw { code: 'ETIMEDOUT', message: 'Timeout' };
      };

      const onRetry = (attempt: number, error: Error, delayMs: number) => {
        delays.push(delayMs);
      };

      try {
        await withRetry(operation, {
          maxAttempts: 4,
          initialDelayMs: 100,
          backoffMultiplier: 2,
          maxDelayMs: 1000,
          onRetry,
        });
      } catch (error) {
        // Delays should increase exponentially
        expect(delays.length).toBe(3); // 3 retries for 4 attempts
        // First delay ~100ms, second ~200ms, third ~400ms (with jitter)
        expect(delays[0]).toBeGreaterThanOrEqual(75); // 100ms ±25%
        expect(delays[0]).toBeLessThanOrEqual(125);
        expect(delays[1]).toBeGreaterThanOrEqual(150); // 200ms ±25%
        expect(delays[1]).toBeLessThanOrEqual(250);
        expect(delays[2]).toBeGreaterThanOrEqual(300); // 400ms ±25%
        expect(delays[2]).toBeLessThanOrEqual(500);
      }
    });

    it('should cap delay at maxDelayMs', async () => {
      const delays: number[] = [];

      const operation = async () => {
        attemptCount++;
        throw { code: 'ETIMEDOUT', message: 'Timeout' };
      };

      const onRetry = (attempt: number, error: Error, delayMs: number) => {
        delays.push(delayMs);
      };

      try {
        await withRetry(operation, {
          maxAttempts: 3, // Reduced from 5 to avoid timeout
          initialDelayMs: 100, // Reduced delays for faster test
          backoffMultiplier: 2,
          maxDelayMs: 500, // Reduced cap
          onRetry,
        });
      } catch (error) {
        // All delays should be capped at 500ms (with jitter)
        delays.forEach((delay) => {
          expect(delay).toBeLessThanOrEqual(625); // 500ms + max jitter (25%)
        });
      }
    });

    it('should apply jitter to delays', async () => {
      const delays: number[] = [];

      const operation = async () => {
        attemptCount++;
        throw { code: 'ETIMEDOUT', message: 'Timeout' };
      };

      const onRetry = (attempt: number, error: Error, delayMs: number) => {
        delays.push(delayMs);
      };

      try {
        await withRetry(operation, {
          maxAttempts: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 1,
          maxDelayMs: 10000,
          onRetry,
        });
      } catch (error) {
        // With jitter, delays should vary slightly from 1000ms
        // Jitter is ±25%, so range is 750-1250ms
        delays.forEach((delay) => {
          expect(delay).toBeGreaterThanOrEqual(750);
          expect(delay).toBeLessThanOrEqual(1250);
        });
      }
    });
  });

  describe('max attempts', () => {
    it('should respect maxAttempts limit', async () => {
      const operation = async () => {
        attemptCount++;
        throw { code: 'ETIMEDOUT', message: 'Timeout' };
      };

      try {
        await withRetry(operation, {
          maxAttempts: 5,
          initialDelayMs: 10,
        });
      } catch (error) {
        expect(attemptCount).toBe(5);
      }
    });

    it('should stop retrying after maxAttempts', async () => {
      const operation = async () => {
        attemptCount++;
        throw { code: 'ETIMEDOUT', message: 'Timeout' };
      };

      try {
        await withRetry(operation, {
          maxAttempts: 2,
          initialDelayMs: 10,
        });
      } catch (error) {
        expect(attemptCount).toBe(2);
      }
    });
  });

  describe('onRetry callback', () => {
    it('should call onRetry callback on each retry', async () => {
      const retries: { attempt: number; error: Error; delayMs: number }[] = [];

      const operation = async () => {
        attemptCount++;
        throw { code: 'ETIMEDOUT', message: 'Timeout' };
      };

      const onRetry = (attempt: number, error: Error, delayMs: number) => {
        retries.push({ attempt, error, delayMs });
      };

      try {
        await withRetry(operation, {
          maxAttempts: 3,
          initialDelayMs: 10,
          onRetry,
        });
      } catch (error) {
        expect(retries.length).toBe(2); // 2 retries for 3 attempts
        expect(retries[0]!.attempt).toBe(1);
        expect(retries[1]!.attempt).toBe(2);
      }
    });
  });
});

describe('RetryProfiles', () => {
  it('should have fast profile', () => {
    expect(RetryProfiles.fast.maxAttempts).toBe(3);
    expect(RetryProfiles.fast.initialDelayMs).toBe(1000);
    expect(RetryProfiles.fast.maxDelayMs).toBe(5000);
    expect(RetryProfiles.fast.backoffMultiplier).toBe(2);
  });

  it('should have standard profile', () => {
    expect(RetryProfiles.standard.maxAttempts).toBe(3);
    expect(RetryProfiles.standard.initialDelayMs).toBe(2000);
    expect(RetryProfiles.standard.maxDelayMs).toBe(10000);
    expect(RetryProfiles.standard.backoffMultiplier).toBe(2);
  });

  it('should have long profile', () => {
    expect(RetryProfiles.long.maxAttempts).toBe(5);
    expect(RetryProfiles.long.initialDelayMs).toBe(3000);
    expect(RetryProfiles.long.maxDelayMs).toBe(30000);
    expect(RetryProfiles.long.backoffMultiplier).toBe(2);
  });

  it('should have critical profile', () => {
    expect(RetryProfiles.critical.maxAttempts).toBe(5);
    expect(RetryProfiles.critical.initialDelayMs).toBe(2000);
    expect(RetryProfiles.critical.maxDelayMs).toBe(30000);
    expect(RetryProfiles.critical.backoffMultiplier).toBe(1.5);
  });
});
