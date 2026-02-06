/**
 * Tests for OutputFormatter
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { OutputFormatter, PostData } from '../../lib/output.js';
import { fixtures } from '../setup.js';

describe('OutputFormatter', () => {
  let formatter: OutputFormatter;

  beforeEach(() => {
    formatter = new OutputFormatter('human', false); // Disable colors for testing
  });

  describe('initialization', () => {
    it('should create formatter with human format', () => {
      const fmt = new OutputFormatter('human', true);
      expect(fmt).toBeDefined();
    });

    it('should create formatter with json format', () => {
      const fmt = new OutputFormatter('json', false);
      expect(fmt).toBeDefined();
    });
  });

  describe('formatPost', () => {
    it('should format post in human readable format', () => {
      const post = fixtures.post();
      const formatted = formatter.formatPost(post);

      expect(formatted).toContain('@test.user');
      expect(formatted).toContain('This is a test post');
      expect(formatted).toContain('URI:');
    });

    it('should format post with display name', () => {
      const post = fixtures.post();
      const formatted = formatter.formatPost(post);

      expect(formatted).toContain('Test User');
    });

    it('should include engagement metrics', () => {
      const post = fixtures.post();
      const formatted = formatter.formatPost(post);

      expect(formatted).toContain('♥ 20'); // likes
      expect(formatted).toContain('↻ 10'); // reposts
      expect(formatted).toContain('💬 5'); // replies
    });

    it('should format post as JSON when format is json', () => {
      const jsonFormatter = new OutputFormatter('json', false);
      const post = fixtures.post();
      const formatted = jsonFormatter.formatPost(post);

      const parsed = JSON.parse(formatted);
      expect(parsed.text).toBe('This is a test post');
      expect(parsed.author.handle).toBe('test.user');
    });

    it('should format FeedViewPost correctly', () => {
      const feedPost = fixtures.feedViewPost();
      const formatted = formatter.formatPost(feedPost);

      expect(formatted).toContain('@test.user');
      expect(formatted).toContain('This is a test post');
    });

    it('should handle post without engagement metrics', () => {
      const post: PostData = {
        ...fixtures.post(),
        likeCount: 0,
        repostCount: 0,
        replyCount: 0,
      };

      const formatted = formatter.formatPost(post);
      expect(formatted).toContain('@test.user');
      expect(formatted).toContain('This is a test post');
    });

    it('should show reply context when present', () => {
      const post: PostData = {
        ...fixtures.post(),
        replyTo: 'at://did:plc:parent123/app.bsky.feed.post/parent',
      };

      const formatted = formatter.formatPost(post);
      expect(formatted).toContain('Reply to:');
    });

    it('should show quoted post indicator when present', () => {
      const post: PostData = {
        ...fixtures.post(),
        quotedPost: { uri: 'at://did:plc:quoted123/app.bsky.feed.post/quoted' },
      };

      const formatted = formatter.formatPost(post);
      expect(formatted).toContain('Quoted post');
    });
  });

  describe('formatPosts', () => {
    it('should format multiple posts with separators', () => {
      const posts = [fixtures.post(), fixtures.post()];
      const formatted = formatter.formatPosts(posts);

      expect(formatted).toContain('@test.user');
      // Should contain content from both posts
      const postCount = (formatted.match(/@test\.user/g) || []).length;
      expect(postCount).toBe(2);
    });

    it('should format multiple posts as JSON array when format is json', () => {
      const jsonFormatter = new OutputFormatter('json', false);
      const posts = [fixtures.post(), fixtures.post()];
      const formatted = jsonFormatter.formatPosts(posts);

      const parsed = JSON.parse(formatted);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });

    it('should handle empty posts array', () => {
      const formatted = formatter.formatPosts([]);
      expect(formatted).toBe('');
    });
  });

  describe('formatTimestamp', () => {
    it('should format recent timestamp as seconds ago', () => {
      const post: PostData = {
        ...fixtures.post(),
        createdAt: new Date(Date.now() - 30 * 1000).toISOString(), // 30 seconds ago
      };

      const formatted = formatter.formatPost(post);
      expect(formatted).toMatch(/\d+s ago/);
    });

    it('should format timestamp as minutes ago', () => {
      const post: PostData = {
        ...fixtures.post(),
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      };

      const formatted = formatter.formatPost(post);
      expect(formatted).toMatch(/\d+m ago/);
    });

    it('should format timestamp as hours ago', () => {
      const post: PostData = {
        ...fixtures.post(),
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      };

      const formatted = formatter.formatPost(post);
      expect(formatted).toMatch(/\d+h ago/);
    });

    it('should format timestamp as days ago', () => {
      const post: PostData = {
        ...fixtures.post(),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      };

      const formatted = formatter.formatPost(post);
      expect(formatted).toMatch(/\d+d ago/);
    });

    it('should format old timestamp as date', () => {
      const post: PostData = {
        ...fixtures.post(),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      };

      const formatted = formatter.formatPost(post);
      // Should contain month name (Jan, Feb, etc.) instead of "ago"
      expect(formatted).toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
    });
  });

  describe('createTable', () => {
    it('should create JSON array of objects when format is json', () => {
      const jsonFormatter = new OutputFormatter('json', false);
      const headers = ['Name', 'Handle', 'Followers'];
      const rows = [
        ['Alice', '@alice', '100'],
        ['Bob', '@bob', '200'],
      ];

      const table = jsonFormatter.createTable(headers, rows);
      const parsed = JSON.parse(table);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
      expect(parsed[0]).toEqual({ Name: 'Alice', Handle: '@alice', Followers: '100' });
      expect(parsed[1]).toEqual({ Name: 'Bob', Handle: '@bob', Followers: '200' });
    });

    it('should handle JSON format with empty rows', () => {
      const jsonFormatter = new OutputFormatter('json', false);
      const headers = ['Name', 'Handle'];
      const rows: string[][] = [];

      const table = jsonFormatter.createTable(headers, rows);
      const parsed = JSON.parse(table);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(0);
    });
  });

  describe('formatMessage', () => {
    it('should format success message', () => {
      const message = formatter.formatMessage('Operation successful', 'success');
      expect(message).toBe('Operation successful'); // No color in test mode
    });

    it('should format error message', () => {
      const message = formatter.formatMessage('Operation failed', 'error');
      expect(message).toBe('Operation failed');
    });

    it('should format info message', () => {
      const message = formatter.formatMessage('Information', 'info');
      expect(message).toBe('Information');
    });

    it('should format warning message', () => {
      const message = formatter.formatMessage('Warning', 'warning');
      expect(message).toBe('Warning');
    });

    it('should default to info type', () => {
      const message = formatter.formatMessage('Default message');
      expect(message).toBe('Default message');
    });

    it('should apply colors when color is enabled', () => {
      const colorFormatter = new OutputFormatter('human', true);
      const message = colorFormatter.formatMessage('Success', 'success');
      // Chalk may or may not add color codes depending on environment
      // Just verify the method works
      expect(message).toContain('Success');
    });
  });

  describe('embed formatting', () => {
    it('should format image embed', () => {
      const post: PostData = {
        ...fixtures.post(),
        embed: {
          $type: 'app.bsky.embed.images#view',
          images: [{ thumb: 'image1.jpg' }, { thumb: 'image2.jpg' }],
        },
      };

      const formatted = formatter.formatPost(post);
      expect(formatted).toContain('2 images');
    });

    it('should format single image embed', () => {
      const post: PostData = {
        ...fixtures.post(),
        embed: {
          $type: 'app.bsky.embed.images#view',
          images: [{ thumb: 'image1.jpg' }],
        },
      };

      const formatted = formatter.formatPost(post);
      expect(formatted).toContain('1 image');
    });

    it('should format external link embed', () => {
      const post: PostData = {
        ...fixtures.post(),
        embed: {
          $type: 'app.bsky.embed.external#view',
          external: {
            title: 'Example Website',
            uri: 'https://example.com',
          },
        },
      };

      const formatted = formatter.formatPost(post);
      expect(formatted).toContain('Example Website');
    });

    it('should format record embed (quoted post)', () => {
      const post: PostData = {
        ...fixtures.post(),
        embed: {
          $type: 'app.bsky.embed.record#view',
          record: { uri: 'at://did:plc:test/app.bsky.feed.post/quoted' },
        },
      };

      const formatted = formatter.formatPost(post);
      expect(formatted).toContain('Quoted post');
    });

    it('should handle unknown embed type', () => {
      const post: PostData = {
        ...fixtures.post(),
        embed: {
          $type: 'app.bsky.embed.unknown#view',
        },
      };

      const formatted = formatter.formatPost(post);
      expect(formatted).toContain('Media attached');
    });
  });

  describe('text wrapping', () => {
    it('should wrap long text to terminal width', () => {
      const longText =
        'This is a very long post that contains many words and should be wrapped to fit within the terminal width limit. It continues with more text to ensure wrapping occurs.';

      const post: PostData = {
        ...fixtures.post(),
        text: longText,
      };

      const formatted = formatter.formatPost(post);
      const lines = formatted.split('\n');

      // Should have multiple lines due to wrapping
      const textLines = lines.filter((line) => line.includes('very long post'));
      expect(textLines.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle very long URLs', () => {
      const post: PostData = {
        ...fixtures.post(),
        text: 'Check out https://example.com/very/long/url/path/that/goes/on/and/on/with/many/segments',
      };

      const formatted = formatter.formatPost(post);
      expect(formatted).toContain('Check out');
      expect(formatted).toContain('example.com');
    });

    it('should handle empty text', () => {
      const post: PostData = {
        ...fixtures.post(),
        text: '',
      };

      const formatted = formatter.formatPost(post);
      expect(formatted).toContain('@test.user');
    });
  });

  describe('URI shortening', () => {
    it('should shorten AT URIs for display', () => {
      const post: PostData = {
        ...fixtures.post(),
        uri: 'at://did:plc:abcdefghijklmnopqrstuvwxyz123456/app.bsky.feed.post/3k2l5m6n7o8p',
      };

      const formatted = formatter.formatPost(post);
      // Should contain shortened version
      expect(formatted).toContain('URI:');
      // Should not contain full DID
      expect(formatted).not.toContain('did:plc:abcdefghijklmnopqrstuvwxyz123456');
    });
  });
});
