/**
 * Retry logic with exponential backoff for network operations
 */

import { fromApiError } from './errors.js';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ESOCKETTIMEDOUT',
  ],
  onRetry: () => {},
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
  const delayWithCap = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter (±25% randomness)
  const jitter = delayWithCap * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(delayWithCap + jitter);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  // Network errors
  if (error.code && retryableErrors.includes(error.code)) {
    return true;
  }

  // 5xx server errors (except 501 Not Implemented)
  const status = error.status || error.statusCode;
  if (status >= 500 && status < 600 && status !== 501) {
    return true;
  }

  // 429 Rate limit (but handle with special backoff)
  if (status === 429) {
    return true;
  }

  // Specific error messages
  if (
    error.message?.includes('socket hang up') ||
    error.message?.includes('Connection reset') ||
    error.message?.includes('ETIMEDOUT')
  ) {
    return true;
  }

  return false;
}

/**
 * Retry an async operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === opts.maxAttempts) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        break;
      }

      // Handle rate limiting with special backoff
      if (error.status === 429 || error.statusCode === 429) {
        const retryAfter = error.headers?.['retry-after'];
        const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : opts.initialDelayMs;
        opts.onRetry(attempt, error, delayMs);
        await sleep(delayMs);
        continue;
      }

      // Calculate delay with exponential backoff
      const delayMs = calculateDelay(
        attempt,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier
      );

      opts.onRetry(attempt, error, delayMs);
      await sleep(delayMs);
    }
  }

  // All retries exhausted, throw the last error
  throw fromApiError(lastError!);
}

/**
 * Retry configuration for different operation types
 */
export const RetryProfiles = {
  // Fast operations (login, single requests)
  fast: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
  },

  // Standard operations (timeline, posts)
  standard: {
    maxAttempts: 3,
    initialDelayMs: 2000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  },

  // Long operations (uploads, batch operations)
  long: {
    maxAttempts: 5,
    initialDelayMs: 3000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },

  // Critical operations (never give up easily)
  critical: {
    maxAttempts: 5,
    initialDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 1.5,
  },
} as const;
