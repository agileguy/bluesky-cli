import chalk from 'chalk';
import {
  AppBskyFeedDefs,
  AppBskyNotificationListNotifications,
  AppBskyActorDefs,
  ChatBskyConvoDefs,
} from '@atproto/api';

/**
 * Utility class for formatting Bluesky posts, notifications, and other content
 * Provides consistent formatting across all timeline-related commands
 */
export class OutputFormatter {
  private useColor: boolean;

  constructor(useColor: boolean = true) {
    this.useColor = useColor;
  }

  /**
   * Format a timestamp as a relative time string (e.g., "2h ago", "yesterday")
   */
  formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return then.toLocaleDateString();
    }
  }

  /**
   * Format a post for display
   */
  formatPost(post: AppBskyFeedDefs.FeedViewPost, showEngagement: boolean = true): string {
    const postView = post.post;
    const author = postView.author;
    const record = postView.record as any;

    const lines: string[] = [];

    // Author line
    const authorLine = this.useColor
      ? `${chalk.bold(author.displayName || author.handle)} ${chalk.gray(`@${author.handle}`)}`
      : `${author.displayName || author.handle} @${author.handle}`;
    lines.push(authorLine);

    // Timestamp
    const timestamp = this.formatRelativeTime(postView.indexedAt);
    const timestampLine = this.useColor ? chalk.gray(`  ${timestamp}`) : `  ${timestamp}`;
    lines.push(timestampLine);

    // Post text
    if (record.text) {
      const text = record.text
        .split('\n')
        .map((line: string) => `  ${line}`)
        .join('\n');
      lines.push(text);
    }

    // Engagement metrics
    if (showEngagement) {
      const metrics = [];
      const likeCount = postView.likeCount || 0;
      const repostCount = postView.repostCount || 0;
      const replyCount = postView.replyCount || 0;

      if (replyCount > 0) {
        metrics.push(`💬 ${replyCount}`);
      }
      if (repostCount > 0) {
        metrics.push(`🔄 ${repostCount}`);
      }
      if (likeCount > 0) {
        metrics.push(`❤️ ${likeCount}`);
      }

      if (metrics.length > 0) {
        const metricsLine = this.useColor
          ? chalk.gray(`  ${metrics.join('  ')}`)
          : `  ${metrics.join('  ')}`;
        lines.push(metricsLine);
      }
    }

    // Post URI for reference (in gray, compact format)
    const uri = postView.uri;
    const shortUri = uri.split('/').pop() || uri;
    const uriLine = this.useColor ? chalk.gray(`  [${shortUri}]`) : `  [${shortUri}]`;
    lines.push(uriLine);

    return lines.join('\n');
  }

  /**
   * Format a notification for display
   */
  formatNotification(notification: AppBskyNotificationListNotifications.Notification): string {
    const lines: string[] = [];

    // Get notification type indicator
    let typeIndicator = '🔔';
    let actionText = 'notified you';

    switch (notification.reason) {
      case 'follow':
        typeIndicator = '🔔';
        actionText = 'followed you';
        break;
      case 'like':
        typeIndicator = '❤️';
        actionText = 'liked your post';
        break;
      case 'repost':
        typeIndicator = '🔄';
        actionText = 'reposted your post';
        break;
      case 'reply':
        typeIndicator = '💬';
        actionText = 'replied to your post';
        break;
      case 'mention':
        typeIndicator = '📢';
        actionText = 'mentioned you';
        break;
      case 'quote':
        typeIndicator = '🗣️';
        actionText = 'quoted your post';
        break;
    }

    // Author line with action
    const author = notification.author;
    const authorLine = this.useColor
      ? `${typeIndicator} ${chalk.bold(author.displayName || author.handle)} ${chalk.gray(`@${author.handle}`)} ${actionText}`
      : `${typeIndicator} ${author.displayName || author.handle} @${author.handle} ${actionText}`;
    lines.push(authorLine);

    // Timestamp and unread indicator
    const timestamp = this.formatRelativeTime(notification.indexedAt);
    const unreadIndicator = !notification.isRead ? ' [UNREAD]' : '';
    const timestampLine = this.useColor
      ? chalk.gray(`  ${timestamp}${unreadIndicator}`)
      : `  ${timestamp}${unreadIndicator}`;
    lines.push(timestampLine);

    // Include notification text if available (for replies, mentions, quotes)
    if (
      notification.record &&
      typeof notification.record === 'object' &&
      'text' in notification.record
    ) {
      const text = (notification.record as any).text as string;
      if (text) {
        const formattedText = text
          .split('\n')
          .map((line: string) => `  ${line}`)
          .join('\n');
        lines.push(formattedText);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format a user profile for display
   */
  formatProfile(profile: AppBskyActorDefs.ProfileView): string {
    const lines: string[] = [];

    const nameLine = this.useColor
      ? `${chalk.bold(profile.displayName || profile.handle)} ${chalk.gray(`@${profile.handle}`)}`
      : `${profile.displayName || profile.handle} @${profile.handle}`;
    lines.push(nameLine);

    if (profile.description) {
      lines.push(`  ${profile.description}`);
    }

    const stats = [];
    const profileWithStats = profile as any;
    if (profileWithStats.followersCount !== undefined) {
      stats.push(`${profileWithStats.followersCount} followers`);
    }
    if (profileWithStats.followsCount !== undefined) {
      stats.push(`${profileWithStats.followsCount} following`);
    }
    if (profileWithStats.postsCount !== undefined) {
      stats.push(`${profileWithStats.postsCount} posts`);
    }

    if (stats.length > 0) {
      const statsLine = this.useColor
        ? chalk.gray(`  ${stats.join(' • ')}`)
        : `  ${stats.join(' • ')}`;
      lines.push(statsLine);
    }

    return lines.join('\n');
  }

  /**
   * Format pagination cursor hint
   */
  formatCursorHint(cursor?: string): string {
    if (!cursor) {
      return this.useColor ? chalk.gray('  (No more items)') : '  (No more items)';
    }

    const hint = `Use --cursor="${cursor}" for more`;
    return this.useColor ? chalk.gray(`  ${hint}`) : `  ${hint}`;
  }

  /**
   * Format a separator line between items
   */
  formatSeparator(): string {
    const separator = '─'.repeat(50);
    return this.useColor ? chalk.gray(separator) : separator;
  }

  /**
   * Format a conversation (DM) for display in list
   * @param convo The conversation to format
   * @param currentUserDid The DID of the current user to filter out from members
   */
  formatConversation(convo: ChatBskyConvoDefs.ConvoView, currentUserDid: string): string {
    const lines: string[] = [];

    // Get the other participant(s) - filter out current user
    const otherMembers = convo.members.filter((member) => member.did !== currentUserDid);

    if (otherMembers.length === 0) {
      // Shouldn't happen, but handle gracefully
      return this.useColor ? chalk.gray('  (Unknown conversation)') : '  (Unknown conversation)';
    }

    // For now, show the first other member (group DMs might have multiple)
    const otherMember = otherMembers[0]!;

    // Build the participant line with unread indicator
    const unreadIndicator = convo.unreadCount > 0 ? '🔔 ' : '   ';
    const displayName = otherMember.displayName || otherMember.handle;
    const handle = `@${otherMember.handle}`;

    const participantLine = this.useColor
      ? `${unreadIndicator}${chalk.bold(displayName)} ${chalk.gray(handle)}`
      : `${unreadIndicator}${displayName} ${handle}`;
    lines.push(participantLine);

    // Last message preview
    if (convo.lastMessage) {
      const lastMsg = convo.lastMessage as any;

      // Check if it's a deleted message
      if (lastMsg.$type === 'chat.bsky.convo.defs#deletedMessageView') {
        const deletedLine = this.useColor
          ? chalk.gray('   [Message deleted]')
          : '   [Message deleted]';
        lines.push(deletedLine);
      } else if ('text' in lastMsg && lastMsg.text) {
        // Truncate message text to 50 characters
        const truncatedText = lastMsg.text.length > 50
          ? `${lastMsg.text.substring(0, 50)}...`
          : lastMsg.text;

        // Replace newlines with spaces for preview
        const previewText = truncatedText.replace(/\n/g, ' ');

        // Format timestamp
        const timestamp = this.formatRelativeTime(lastMsg.sentAt);

        const messageLine = this.useColor
          ? chalk.gray(`   "${previewText}" · ${timestamp}`)
          : `   "${previewText}" · ${timestamp}`;
        lines.push(messageLine);
      }
    } else {
      // No messages yet
      const noMessagesLine = this.useColor
        ? chalk.gray('   (No messages)')
        : '   (No messages)';
      lines.push(noMessagesLine);
    }

    return lines.join('\n');
  }
}
