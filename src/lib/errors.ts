/**
 * Comprehensive error handling for Bluesky CLI
 * Provides structured error types with user-friendly messages and actionable advice
 */

export interface BskyErrorOptions {
  code?: string;
  statusCode?: number;
  cause?: Error;
  details?: Record<string, any>;
}

/**
 * Base error class for all Bluesky CLI errors
 */
export class BskyError extends Error {
  public readonly code?: string;
  public readonly statusCode?: number;
  public override readonly cause?: Error;
  public readonly details?: Record<string, any>;

  constructor(message: string, options: BskyErrorOptions = {}) {
    super(message);
    this.name = 'BskyError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.cause = options.cause;
    this.details = options.details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get a user-friendly error message with actionable advice
   */
  getUserMessage(): string {
    return this.message;
  }

  /**
   * Get formatted error output for debug mode
   */
  getDebugOutput(): string {
    const parts = [
      `${this.name}: ${this.message}`,
      this.code ? `Code: ${this.code}` : null,
      this.statusCode ? `Status: ${this.statusCode}` : null,
      this.details ? `Details: ${JSON.stringify(this.details, null, 2)}` : null,
      this.cause ? `Caused by: ${this.cause.message}` : null,
      this.stack ? `Stack: ${this.stack}` : null,
    ];

    return parts.filter(Boolean).join('\n');
  }
}

/**
 * Authentication and authorization errors
 */
export class AuthError extends BskyError {
  constructor(message: string, options: BskyErrorOptions = {}) {
    super(message, options);
    this.name = 'AuthError';
  }

  override getUserMessage(): string {
    switch (this.code) {
      case 'INVALID_CREDENTIALS':
        return 'Invalid handle or password. Please check your credentials and try again.';
      case 'SESSION_EXPIRED':
        return 'Your session has expired. Please run "bsky login" to log in again.';
      case 'NOT_AUTHENTICATED':
        return 'Not logged in. Run "bsky login" to authenticate.';
      case 'TOKEN_REFRESH_FAILED':
        return 'Failed to refresh authentication token. Please run "bsky login" again.';
      default:
        return this.message;
    }
  }
}

/**
 * Network connectivity and request errors
 */
export class NetworkError extends BskyError {
  constructor(message: string, options: BskyErrorOptions = {}) {
    super(message, options);
    this.name = 'NetworkError';
  }

  override getUserMessage(): string {
    switch (this.code) {
      case 'CONNECTION_FAILED':
        return 'Could not connect to Bluesky. Please check your internet connection and try again.';
      case 'TIMEOUT':
        return 'Request timed out. Please check your internet connection and try again.';
      case 'DNS_LOOKUP_FAILED':
        return 'Failed to resolve Bluesky server. Please check your internet connection.';
      case 'CONNECTION_REFUSED':
        return 'Connection refused by server. The service may be down or unreachable.';
      case 'SOCKET_HANG_UP':
        return 'Connection lost. Please try again.';
      default:
        return `Network error: ${this.message}. Please check your internet connection.`;
    }
  }
}

/**
 * Rate limiting errors from the API
 */
export class RateLimitError extends BskyError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, options: BskyErrorOptions = {}) {
    super(message, options);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }

  override getUserMessage(): string {
    if (this.retryAfter) {
      const seconds = Math.ceil(this.retryAfter / 1000);
      return `Rate limit exceeded. Please wait ${seconds} seconds before trying again.`;
    }
    return 'Rate limit exceeded. Please wait a moment before trying again.';
  }
}

/**
 * Input validation errors
 */
export class ValidationError extends BskyError {
  constructor(message: string, options: BskyErrorOptions = {}) {
    super(message, options);
    this.name = 'ValidationError';
  }

  override getUserMessage(): string {
    return `Validation error: ${this.message}`;
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends BskyError {
  constructor(message: string, options: BskyErrorOptions = {}) {
    super(message, options);
    this.name = 'NotFoundError';
  }

  override getUserMessage(): string {
    return `Not found: ${this.message}`;
  }
}

/**
 * Map error codes to exit codes
 */
export function getExitCode(error: Error): number {
  if (error instanceof AuthError) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        return 1;
      case 'SESSION_EXPIRED':
        return 2;
      case 'NOT_AUTHENTICATED':
        return 3;
      default:
        return 1;
    }
  }

  if (error instanceof NetworkError) {
    return 4;
  }

  if (error instanceof RateLimitError) {
    return 5;
  }

  if (error instanceof ValidationError) {
    return 6;
  }

  if (error instanceof NotFoundError) {
    return 7;
  }

  // Generic error
  return 1;
}

/**
 * Format error for display based on debug mode
 */
export function formatError(error: Error, debug: boolean = false): string {
  if (error instanceof BskyError) {
    if (debug) {
      return error.getDebugOutput();
    }
    return error.getUserMessage();
  }

  if (debug) {
    return `${error.name}: ${error.message}\n${error.stack || 'No stack trace available'}`;
  }

  return error.message;
}

/**
 * Create error from API response
 */
export function fromApiError(error: any): BskyError {
  // Network errors
  if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
    return new NetworkError('DNS lookup failed', {
      code: 'DNS_LOOKUP_FAILED',
      cause: error,
    });
  }

  if (error.code === 'ECONNREFUSED') {
    return new NetworkError('Connection refused', {
      code: 'CONNECTION_REFUSED',
      cause: error,
    });
  }

  if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
    return new NetworkError('Request timed out', {
      code: 'TIMEOUT',
      cause: error,
    });
  }

  if (error.code === 'ECONNRESET' || error.message?.includes('socket hang up')) {
    return new NetworkError('Connection lost', {
      code: 'SOCKET_HANG_UP',
      cause: error,
    });
  }

  // HTTP status code errors
  const status = error.status || error.statusCode;

  if (status === 401) {
    return new AuthError('Unauthorized', {
      code: 'SESSION_EXPIRED',
      statusCode: status,
      cause: error,
    });
  }

  if (status === 429) {
    const retryAfter = error.headers?.['retry-after'];
    const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
    return new RateLimitError('Too many requests', retryAfterMs, {
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: status,
      cause: error,
    });
  }

  if (status === 404) {
    return new NotFoundError('Resource not found', {
      code: 'NOT_FOUND',
      statusCode: status,
      cause: error,
    });
  }

  if (status === 400) {
    return new ValidationError(error.message || 'Invalid request', {
      code: 'INVALID_REQUEST',
      statusCode: status,
      cause: error,
    });
  }

  // Authentication specific errors
  if (error.message?.includes('Invalid identifier or password')) {
    return new AuthError('Invalid credentials', {
      code: 'INVALID_CREDENTIALS',
      cause: error,
    });
  }

  if (error.message?.includes('ExpiredToken') || error.message?.includes('Token has expired')) {
    return new AuthError('Token expired', {
      code: 'SESSION_EXPIRED',
      cause: error,
    });
  }

  // Generic network error
  if (error.message?.includes('Network') || error.message?.includes('fetch failed')) {
    return new NetworkError(error.message, {
      code: 'CONNECTION_FAILED',
      cause: error,
    });
  }

  // Generic error
  return new BskyError(error.message || 'An unexpected error occurred', {
    cause: error,
  });
}
