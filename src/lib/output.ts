import chalk from 'chalk';
import Table from 'cli-table3';
import type { AppBskyFeedDefs } from '@atproto/api';

/**
 * Output format types
 */
export type OutputFormat = 'human' | 'json';

/**
 * Post data interface with engagement metrics
 */
export interface PostData {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  text: string;
  createdAt: string;
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  embed?: any;
  replyTo?: string;
  quotedPost?: any;
}

/**
 * OutputFormatter handles all output formatting for the CLI
 * Supports both human-readable and JSON output formats
 */
export class OutputFormatter {
  private format: OutputFormat;
  private colorEnabled: boolean;
  private terminalWidth: number;

  constructor(format: OutputFormat = 'human', colorEnabled: boolean = true) {
    this.format = format;
    this.colorEnabled = colorEnabled;
    this.terminalWidth = process.stdout.columns || 80;
  }

  /**
   * Formats a single post for display
   */
  formatPost(post: PostData | AppBskyFeedDefs.FeedViewPost): string {
    if (this.format === 'json') {
      return this.formatPostJson(post);
    }
    return this.formatPostHuman(post);
  }

  /**
   * Formats multiple posts
   */
  formatPosts(posts: (PostData | AppBskyFeedDefs.FeedViewPost)[]): string {
    if (this.format === 'json') {
      return JSON.stringify(posts, null, 2);
    }

    return posts.map((post) => this.formatPostHuman(post)).join('\n\n');
  }

  /**
   * Formats a post in human-readable format with styled boxes
   */
  private formatPostHuman(post: PostData | AppBskyFeedDefs.FeedViewPost): string {
    // Extract post data
    const postData = this.normalizePostData(post);

    const lines: string[] = [];

    // Header: Author info
    const authorLine = this.colorEnabled
      ? `${chalk.cyan(chalk.bold(`@${postData.author.handle}`))}${
          postData.author.displayName ? chalk.gray(` (${postData.author.displayName})`) : ''
        }`
      : `@${postData.author.handle}${postData.author.displayName ? ` (${postData.author.displayName})` : ''}`;

    lines.push(authorLine);

    // Timestamp and engagement metrics
    const timestamp = this.formatTimestamp(postData.createdAt);
    const engagement = this.formatEngagement(
      postData.likeCount,
      postData.repostCount,
      postData.replyCount
    );

    const metaLine = this.colorEnabled
      ? `${chalk.gray(timestamp)}  ${engagement}`
      : `${timestamp}  ${engagement}`;

    lines.push(metaLine);

    // Separator
    lines.push(this.colorEnabled ? chalk.gray('─'.repeat(Math.min(this.terminalWidth - 2, 78))) : '─'.repeat(Math.min(this.terminalWidth - 2, 78)));

    // Post text (wrapped)
    const wrappedText = this.wrapText(postData.text, 78);
    lines.push(wrappedText);

    // Reply/Quote context
    if (postData.replyTo) {
      lines.push('');
      lines.push(this.colorEnabled ? chalk.gray(`↳ Reply to: ${postData.replyTo}`) : `↳ Reply to: ${postData.replyTo}`);
    }

    if (postData.quotedPost) {
      lines.push('');
      lines.push(this.colorEnabled ? chalk.gray('📎 Quoted post attached') : '📎 Quoted post attached');
    }

    // Embed info
    if (postData.embed) {
      lines.push('');
      lines.push(this.formatEmbed(postData.embed));
    }

    // Footer: URI (shortened for readability)
    const shortUri = this.shortenUri(postData.uri);
    lines.push('');
    lines.push(this.colorEnabled ? chalk.gray(`URI: ${shortUri}`) : `URI: ${shortUri}`);

    return lines.join('\n');
  }

  /**
   * Formats a post as JSON
   */
  private formatPostJson(post: PostData | AppBskyFeedDefs.FeedViewPost): string {
    return JSON.stringify(post, null, 2);
  }

  /**
   * Normalizes post data from various ATProto types
   */
  private normalizePostData(post: PostData | AppBskyFeedDefs.FeedViewPost): PostData {
    // If it's already PostData format
    if ('uri' in post && 'author' in post && !('post' in post)) {
      return post as PostData;
    }

    // If it's a FeedViewPost
    const feedPost = post as AppBskyFeedDefs.FeedViewPost;
    const postView = feedPost.post;

    // Handle reply parent URI - need to check if it's a PostView
    let replyParentUri: string | undefined;
    if (feedPost.reply?.parent) {
      const parent = feedPost.reply.parent;
      if ('uri' in parent) {
        replyParentUri = parent.uri;
      }
    }

    return {
      uri: postView.uri,
      cid: postView.cid,
      author: {
        did: postView.author.did,
        handle: postView.author.handle,
        displayName: postView.author.displayName,
        avatar: postView.author.avatar,
      },
      text: (postView.record as any)?.text || '',
      createdAt: postView.indexedAt,
      replyCount: postView.replyCount,
      repostCount: postView.repostCount,
      likeCount: postView.likeCount,
      embed: postView.embed,
      replyTo: replyParentUri,
      quotedPost: (postView.embed as any)?.record,
    };
  }

  /**
   * Formats timestamp as relative time (e.g., "2h ago")
   */
  private formatTimestamp(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return `${diffSec}s ago`;
    } else if (diffMin < 60) {
      return `${diffMin}m ago`;
    } else if (diffHour < 24) {
      return `${diffHour}h ago`;
    } else if (diffDay < 7) {
      return `${diffDay}d ago`;
    } else {
      // For older posts, show date
      return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  /**
   * Formats engagement metrics (likes, reposts, replies)
   */
  private formatEngagement(likes?: number, reposts?: number, replies?: number): string {
    const parts: string[] = [];

    if (likes !== undefined && likes > 0) {
      parts.push(this.colorEnabled ? chalk.red(`♥ ${likes}`) : `♥ ${likes}`);
    }

    if (reposts !== undefined && reposts > 0) {
      parts.push(this.colorEnabled ? chalk.green(`↻ ${reposts}`) : `↻ ${reposts}`);
    }

    if (replies !== undefined && replies > 0) {
      parts.push(this.colorEnabled ? chalk.blue(`💬 ${replies}`) : `💬 ${replies}`);
    }

    return parts.join('  ');
  }

  /**
   * Wraps text to specified width
   */
  private wrapText(text: string, maxWidth: number): string {
    if (!text) return '';

    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        // Handle very long words (URLs, etc.)
        if (word.length > maxWidth) {
          let remaining = word;
          while (remaining.length > maxWidth) {
            lines.push(remaining.substring(0, maxWidth));
            remaining = remaining.substring(maxWidth);
          }
          currentLine = remaining;
        } else {
          currentLine = word;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }

  /**
   * Formats embed information
   */
  private formatEmbed(embed: any): string {
    if (!embed) return '';

    if (embed.$type === 'app.bsky.embed.images#view') {
      const imageCount = embed.images?.length || 0;
      return this.colorEnabled
        ? chalk.gray(`🖼️  ${imageCount} image${imageCount !== 1 ? 's' : ''}`)
        : `🖼️  ${imageCount} image${imageCount !== 1 ? 's' : ''}`;
    }

    if (embed.$type === 'app.bsky.embed.external#view') {
      return this.colorEnabled
        ? chalk.gray(`🔗 ${embed.external?.title || 'External link'}`)
        : `🔗 ${embed.external?.title || 'External link'}`;
    }

    if (embed.$type === 'app.bsky.embed.record#view') {
      return this.colorEnabled ? chalk.gray('📎 Quoted post') : '📎 Quoted post';
    }

    return this.colorEnabled ? chalk.gray('📎 Media attached') : '📎 Media attached';
  }

  /**
   * Shortens AT URI for display
   */
  private shortenUri(uri: string): string {
    // at://did:plc:xxx.../app.bsky.feed.post/yyy
    const match = uri.match(/at:\/\/(did:plc:[^/]+)\/.*\/([^/]+)$/);
    if (match) {
      const did = match[1]!.substring(0, 20) + '...';
      const rkey = match[2]!;
      return `${did}/${rkey}`;
    }
    return uri;
  }

  /**
   * Creates a table for list display
   */
  createTable(headers: string[], rows: string[][]): string {
    if (this.format === 'json') {
      // Convert table to JSON array of objects
      const objects = rows.map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });
      return JSON.stringify(objects, null, 2);
    }

    const table = new Table({
      head: this.colorEnabled ? headers.map((h) => chalk.cyan(h)) : headers,
      style: {
        head: [],
        border: this.colorEnabled ? ['gray'] : [],
      },
      colWidths: undefined, // Auto-calculate
      wordWrap: true,
    });

    rows.forEach((row) => table.push(row));

    return table.toString();
  }

  /**
   * Formats a simple message
   */
  formatMessage(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): string {
    if (!this.colorEnabled) {
      return message;
    }

    switch (type) {
      case 'success':
        return chalk.green(message);
      case 'error':
        return chalk.red(message);
      case 'warning':
        return chalk.yellow(message);
      case 'info':
      default:
        return chalk.blue(message);
    }
  }
}
