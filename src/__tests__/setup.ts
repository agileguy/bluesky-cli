/**
 * Test utilities and mocks for Bluesky CLI tests
 */

import { Session } from '../lib/config.js';

/**
 * Mock BskyAgent for testing
 */
export class MockBskyAgent {
  public session: any = null;

  async login(params: { identifier: string; password: string }): Promise<any> {
    if (params.identifier === 'test.user' && params.password === 'test-password') {
      this.session = {
        did: 'did:plc:test123',
        handle: 'test.user',
        accessJwt: 'mock-access-jwt',
        refreshJwt: 'mock-refresh-jwt',
      };
      return { success: true, data: this.session };
    }
    throw new Error('Invalid identifier or password');
  }

  async resumeSession(session: Session): Promise<void> {
    this.session = session;
  }

  async getProfile(params: { actor: string }): Promise<any> {
    if (this.session) {
      return {
        success: true,
        data: {
          did: this.session.did,
          handle: this.session.handle,
          displayName: 'Test User',
          description: 'Test profile',
          followersCount: 100,
          followsCount: 50,
          postsCount: 25,
        },
      };
    }
    throw new Error('Not authenticated');
  }

  async post(record: { text: string; createdAt: string }): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated');
    }
    return {
      success: true,
      uri: 'at://did:plc:test123/app.bsky.feed.post/abc123',
      cid: 'bafytest123',
    };
  }

  async deletePost(uri: string): Promise<void> {
    if (!this.session) {
      throw new Error('Not authenticated');
    }
    // Mock successful deletion
  }
}

/**
 * Test fixtures for common data structures
 */
export const fixtures = {
  session: (): Session => ({
    handle: 'test.user',
    did: 'did:plc:test123',
    accessJwt: 'mock-access-jwt-token',
    refreshJwt: 'mock-refresh-jwt-token',
    lastUsed: new Date().toISOString(),
  }),

  profile: () => ({
    did: 'did:plc:test123',
    handle: 'test.user',
    displayName: 'Test User',
    description: 'Test profile description',
    avatar: 'https://example.com/avatar.jpg',
    followersCount: 100,
    followsCount: 50,
    postsCount: 25,
    indexedAt: new Date().toISOString(),
  }),

  post: () => ({
    uri: 'at://did:plc:test123/app.bsky.feed.post/abc123',
    cid: 'bafytest123',
    author: {
      did: 'did:plc:test123',
      handle: 'test.user',
      displayName: 'Test User',
    },
    text: 'This is a test post',
    createdAt: new Date().toISOString(),
    replyCount: 5,
    repostCount: 10,
    likeCount: 20,
  }),

  feedViewPost: () => ({
    post: {
      uri: 'at://did:plc:test123/app.bsky.feed.post/abc123',
      cid: 'bafytest123',
      author: {
        did: 'did:plc:test123',
        handle: 'test.user',
        displayName: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
      },
      record: {
        text: 'This is a test post',
        createdAt: new Date().toISOString(),
      },
      indexedAt: new Date().toISOString(),
      replyCount: 5,
      repostCount: 10,
      likeCount: 20,
    },
    reply: undefined,
    reason: undefined,
  }),
};

/**
 * Helper to create temporary test directory
 */
export function createTempDir(): string {
  const tmpDir = `/tmp/bluesky-cli-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return tmpDir;
}

/**
 * Helper to clean up test directory
 */
export function cleanupTempDir(dir: string): void {
  // Note: Actual implementation would use fs.rmSync or similar
  // For now, just a placeholder
}

/**
 * Mock console methods for testing
 */
export class MockConsole {
  public logs: string[] = [];
  public errors: string[] = [];

  log(...args: any[]): void {
    this.logs.push(args.join(' '));
  }

  error(...args: any[]): void {
    this.errors.push(args.join(' '));
  }

  clear(): void {
    this.logs = [];
    this.errors = [];
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  getErrors(): string[] {
    return [...this.errors];
  }
}
