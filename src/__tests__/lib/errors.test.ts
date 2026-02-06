/**
 * Tests for error handling classes
 */

import { describe, it, expect } from 'bun:test';
import {
  BskyError,
  AuthError,
  NetworkError,
  RateLimitError,
  ValidationError,
  NotFoundError,
  getExitCode,
  formatError,
  fromApiError,
} from '../../lib/errors.js';

describe('BskyError', () => {
  it('should create error with message', () => {
    const error = new BskyError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('BskyError');
  });

  it('should create error with code', () => {
    const error = new BskyError('Test error', { code: 'TEST_ERROR' });
    expect(error.code).toBe('TEST_ERROR');
  });

  it('should create error with status code', () => {
    const error = new BskyError('Test error', { statusCode: 500 });
    expect(error.statusCode).toBe(500);
  });

  it('should create error with cause', () => {
    const cause = new Error('Original error');
    const error = new BskyError('Wrapped error', { cause });
    expect(error.cause).toBe(cause);
  });

  it('should create error with details', () => {
    const details = { field: 'username', value: 'test' };
    const error = new BskyError('Test error', { details });
    expect(error.details).toEqual(details);
  });

  it('should return user message', () => {
    const error = new BskyError('Test error message');
    expect(error.getUserMessage()).toBe('Test error message');
  });

  it('should return debug output', () => {
    const error = new BskyError('Test error', {
      code: 'TEST_CODE',
      statusCode: 400,
    });
    const debug = error.getDebugOutput();
    expect(debug).toContain('BskyError: Test error');
    expect(debug).toContain('Code: TEST_CODE');
    expect(debug).toContain('Status: 400');
  });
});

describe('AuthError', () => {
  it('should create auth error', () => {
    const error = new AuthError('Authentication failed');
    expect(error.name).toBe('AuthError');
    expect(error.message).toBe('Authentication failed');
  });

  it('should return user message for INVALID_CREDENTIALS', () => {
    const error = new AuthError('Invalid credentials', { code: 'INVALID_CREDENTIALS' });
    expect(error.getUserMessage()).toContain('Invalid handle or password');
  });

  it('should return user message for SESSION_EXPIRED', () => {
    const error = new AuthError('Session expired', { code: 'SESSION_EXPIRED' });
    expect(error.getUserMessage()).toContain('session has expired');
    expect(error.getUserMessage()).toContain('bsky login');
  });

  it('should return user message for NOT_AUTHENTICATED', () => {
    const error = new AuthError('Not authenticated', { code: 'NOT_AUTHENTICATED' });
    expect(error.getUserMessage()).toContain('Not logged in');
    expect(error.getUserMessage()).toContain('bsky login');
  });

  it('should return user message for TOKEN_REFRESH_FAILED', () => {
    const error = new AuthError('Token refresh failed', { code: 'TOKEN_REFRESH_FAILED' });
    expect(error.getUserMessage()).toContain('Failed to refresh');
    expect(error.getUserMessage()).toContain('bsky login');
  });

  it('should return default message for unknown code', () => {
    const error = new AuthError('Unknown auth error', { code: 'UNKNOWN' });
    expect(error.getUserMessage()).toBe('Unknown auth error');
  });
});

describe('NetworkError', () => {
  it('should create network error', () => {
    const error = new NetworkError('Connection failed');
    expect(error.name).toBe('NetworkError');
    expect(error.message).toBe('Connection failed');
  });

  it('should return user message for CONNECTION_FAILED', () => {
    const error = new NetworkError('Connection failed', { code: 'CONNECTION_FAILED' });
    expect(error.getUserMessage()).toContain('Could not connect');
    expect(error.getUserMessage()).toContain('internet connection');
  });

  it('should return user message for TIMEOUT', () => {
    const error = new NetworkError('Request timed out', { code: 'TIMEOUT' });
    expect(error.getUserMessage()).toContain('timed out');
  });

  it('should return user message for DNS_LOOKUP_FAILED', () => {
    const error = new NetworkError('DNS lookup failed', { code: 'DNS_LOOKUP_FAILED' });
    expect(error.getUserMessage()).toContain('Failed to resolve');
  });

  it('should return user message for CONNECTION_REFUSED', () => {
    const error = new NetworkError('Connection refused', { code: 'CONNECTION_REFUSED' });
    expect(error.getUserMessage()).toContain('Connection refused');
    expect(error.getUserMessage()).toContain('service may be down');
  });

  it('should return user message for SOCKET_HANG_UP', () => {
    const error = new NetworkError('Socket hang up', { code: 'SOCKET_HANG_UP' });
    expect(error.getUserMessage()).toContain('Connection lost');
  });

  it('should return default network error message for unknown code', () => {
    const error = new NetworkError('Unknown network error', { code: 'UNKNOWN' });
    expect(error.getUserMessage()).toContain('Network error');
    expect(error.getUserMessage()).toContain('Unknown network error');
  });
});

describe('RateLimitError', () => {
  it('should create rate limit error', () => {
    const error = new RateLimitError('Rate limited');
    expect(error.name).toBe('RateLimitError');
    expect(error.message).toBe('Rate limited');
  });

  it('should include retry after time in seconds', () => {
    const error = new RateLimitError('Rate limited', 5000); // 5 seconds
    expect(error.retryAfter).toBe(5000);
    expect(error.getUserMessage()).toContain('wait 5 seconds');
  });

  it('should handle fractional seconds correctly', () => {
    const error = new RateLimitError('Rate limited', 2500); // 2.5 seconds
    expect(error.getUserMessage()).toContain('wait 3 seconds'); // Rounds up
  });

  it('should return generic message without retry after', () => {
    const error = new RateLimitError('Rate limited');
    expect(error.getUserMessage()).toContain('Rate limit exceeded');
    expect(error.getUserMessage()).toContain('wait a moment');
  });
});

describe('ValidationError', () => {
  it('should create validation error', () => {
    const error = new ValidationError('Invalid input');
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Invalid input');
  });

  it('should return user message with validation prefix', () => {
    const error = new ValidationError('Field is required');
    expect(error.getUserMessage()).toContain('Validation error');
    expect(error.getUserMessage()).toContain('Field is required');
  });
});

describe('NotFoundError', () => {
  it('should create not found error', () => {
    const error = new NotFoundError('Resource not found');
    expect(error.name).toBe('NotFoundError');
    expect(error.message).toBe('Resource not found');
  });

  it('should return user message with not found prefix', () => {
    const error = new NotFoundError('User does not exist');
    expect(error.getUserMessage()).toContain('Not found');
    expect(error.getUserMessage()).toContain('User does not exist');
  });
});

describe('getExitCode', () => {
  it('should return 1 for INVALID_CREDENTIALS', () => {
    const error = new AuthError('Invalid credentials', { code: 'INVALID_CREDENTIALS' });
    expect(getExitCode(error)).toBe(1);
  });

  it('should return 2 for SESSION_EXPIRED', () => {
    const error = new AuthError('Session expired', { code: 'SESSION_EXPIRED' });
    expect(getExitCode(error)).toBe(2);
  });

  it('should return 3 for NOT_AUTHENTICATED', () => {
    const error = new AuthError('Not authenticated', { code: 'NOT_AUTHENTICATED' });
    expect(getExitCode(error)).toBe(3);
  });

  it('should return 4 for NetworkError', () => {
    const error = new NetworkError('Connection failed');
    expect(getExitCode(error)).toBe(4);
  });

  it('should return 5 for RateLimitError', () => {
    const error = new RateLimitError('Rate limited');
    expect(getExitCode(error)).toBe(5);
  });

  it('should return 6 for ValidationError', () => {
    const error = new ValidationError('Invalid input');
    expect(getExitCode(error)).toBe(6);
  });

  it('should return 7 for NotFoundError', () => {
    const error = new NotFoundError('Resource not found');
    expect(getExitCode(error)).toBe(7);
  });

  it('should return 1 for generic Error', () => {
    const error = new Error('Generic error');
    expect(getExitCode(error)).toBe(1);
  });
});

describe('formatError', () => {
  it('should format BskyError in user mode', () => {
    const error = new AuthError('Invalid credentials', { code: 'INVALID_CREDENTIALS' });
    const formatted = formatError(error, false);
    expect(formatted).toContain('Invalid handle or password');
  });

  it('should format BskyError in debug mode', () => {
    const error = new AuthError('Invalid credentials', { code: 'INVALID_CREDENTIALS' });
    const formatted = formatError(error, true);
    expect(formatted).toContain('AuthError');
    expect(formatted).toContain('Code: INVALID_CREDENTIALS');
  });

  it('should format generic Error in user mode', () => {
    const error = new Error('Generic error');
    const formatted = formatError(error, false);
    expect(formatted).toBe('Generic error');
  });

  it('should format generic Error in debug mode', () => {
    const error = new Error('Generic error');
    const formatted = formatError(error, true);
    expect(formatted).toContain('Error: Generic error');
  });
});

describe('fromApiError', () => {
  it('should convert ENOTFOUND to NetworkError', () => {
    const apiError = { code: 'ENOTFOUND', message: 'DNS lookup failed' };
    const error = fromApiError(apiError);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.code).toBe('DNS_LOOKUP_FAILED');
  });

  it('should convert ECONNREFUSED to NetworkError', () => {
    const apiError = { code: 'ECONNREFUSED', message: 'Connection refused' };
    const error = fromApiError(apiError);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.code).toBe('CONNECTION_REFUSED');
  });

  it('should convert ETIMEDOUT to NetworkError', () => {
    const apiError = { code: 'ETIMEDOUT', message: 'Request timed out' };
    const error = fromApiError(apiError);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.code).toBe('TIMEOUT');
  });

  it('should convert 401 status to AuthError', () => {
    const apiError = { status: 401, message: 'Unauthorized' };
    const error = fromApiError(apiError);
    expect(error).toBeInstanceOf(AuthError);
    expect(error.code).toBe('SESSION_EXPIRED');
  });

  it('should convert 429 status to RateLimitError', () => {
    const apiError = {
      status: 429,
      message: 'Too many requests',
      headers: { 'retry-after': '60' },
    };
    const error = fromApiError(apiError);
    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfter).toBe(60000); // milliseconds
  });

  it('should convert 404 status to NotFoundError', () => {
    const apiError = { status: 404, message: 'Not found' };
    const error = fromApiError(apiError);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.code).toBe('NOT_FOUND');
  });

  it('should convert 400 status to ValidationError', () => {
    const apiError = { status: 400, message: 'Invalid request' };
    const error = fromApiError(apiError);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.code).toBe('INVALID_REQUEST');
  });

  it('should handle Invalid identifier or password message', () => {
    const apiError = { message: 'Invalid identifier or password' };
    const error = fromApiError(apiError);
    expect(error).toBeInstanceOf(AuthError);
    expect(error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should handle expired token message', () => {
    const apiError = { message: 'ExpiredToken' };
    const error = fromApiError(apiError);
    expect(error).toBeInstanceOf(AuthError);
    expect(error.code).toBe('SESSION_EXPIRED');
  });

  it('should handle network error message', () => {
    const apiError = { message: 'Network error occurred' };
    const error = fromApiError(apiError);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.code).toBe('CONNECTION_FAILED');
  });

  it('should create generic BskyError for unknown errors', () => {
    const apiError = { message: 'Unknown error' };
    const error = fromApiError(apiError);
    expect(error).toBeInstanceOf(BskyError);
    expect(error.message).toBe('Unknown error');
  });

  it('should handle socket hang up error', () => {
    const apiError = { message: 'socket hang up' };
    const error = fromApiError(apiError);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.code).toBe('SOCKET_HANG_UP');
  });
});
