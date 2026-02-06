import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config.js';
import { requireAuth } from '../lib/auth.js';

/**
 * Default message limit
 */
const DEFAULT_LIMIT = 50;

/**
 * Resolves a handle to a DID
 */
async function resolveHandle(agent: any, handle: string): Promise<string> {
  // Remove @ prefix if present
  const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;

  try {
    const response = await agent.resolveHandle({ handle: cleanHandle });

    if (!response.success || !response.data.did) {
      throw new Error(`Could not resolve handle: ${cleanHandle}`);
    }

    return response.data.did;
  } catch (error: any) {
    throw new Error(`Failed to resolve handle ${cleanHandle}: ${error.message}`);
  }
}

/**
 * Gets a conversation with the specified user
 */
async function getConvo(agent: any, memberDid: string): Promise<string | null> {
  try {
    const response = await agent.api.chat.bsky.convo.getConvoForMembers(
      { members: [memberDid] },
      { headers: { 'Atproto-Proxy': 'did:web:api.bsky.chat#bsky_chat' } }
    );

    if (!response.success || !response.data.convo) {
      return null;
    }

    return response.data.convo.id;
  } catch (error: any) {
    return null;
  }
}

/**
 * Gets messages from a conversation
 */
async function getMessages(agent: any, convoId: string, limit: number): Promise<any[]> {
  try {
    const response = await agent.api.chat.bsky.convo.getMessages(
      { convoId: convoId, limit: limit },
      { headers: { 'Atproto-Proxy': 'did:web:api.bsky.chat#bsky_chat' } }
    );

    if (!response.success || !response.data.messages) {
      throw new Error('Failed to retrieve messages');
    }

    return response.data.messages;
  } catch (error: any) {
    throw new Error(`Failed to get messages: ${error.message}`);
  }
}

/**
 * Formats a timestamp as relative time
 */
function formatTimestamp(timestamp: string): string {
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
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

/**
 * Wraps long text to specified width
 */
function wrapText(text: string, maxWidth: number): string {
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
      // Handle very long words
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

  return lines.join('\n       '); // Indent wrapped lines
}

/**
 * Formats messages for human-readable display
 */
function formatMessagesHuman(
  messages: any[],
  currentUserDid: string,
  handle: string,
  colorEnabled: boolean
): string {
  const lines: string[] = [];

  // Header
  const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
  const header = colorEnabled
    ? chalk.cyan(chalk.bold(`Conversation with ${cleanHandle}`))
    : `Conversation with ${cleanHandle}`;
  lines.push(header);
  lines.push(colorEnabled ? chalk.gray('─'.repeat(60)) : '─'.repeat(60));

  // Messages (reverse order to show oldest first)
  const sortedMessages = [...messages].reverse();

  for (const msg of sortedMessages) {
    const isFromCurrentUser = msg.sender.did === currentUserDid;
    const senderLabel = isFromCurrentUser ? 'You:  ' : 'Them: ';
    const timestamp = formatTimestamp(msg.sentAt);

    // Wrap message text
    const wrappedText = wrapText(msg.text, 50);

    const messageLine = colorEnabled
      ? `${chalk.bold(senderLabel)} ${wrappedText}  ${chalk.gray(timestamp)}`
      : `${senderLabel} ${wrappedText}  ${timestamp}`;

    lines.push(messageLine);
  }

  // Footer
  lines.push(colorEnabled ? chalk.gray('─'.repeat(60)) : '─'.repeat(60));

  return lines.join('\n');
}

/**
 * Creates the dm read command
 */
export function createDmReadCommand(config: ConfigManager): Command {
  const command = new Command('read');

  command
    .description('Read direct messages with a user')
    .argument('<handle>', 'user handle (e.g., @alice.bsky.social)')
    .option('-l, --limit <number>', 'maximum number of messages to show', `${DEFAULT_LIMIT}`)
    .option('--json', 'output as JSON')
    .action(async (handle: string, options: any) => {
      try {
        // Parse limit
        const limit = parseInt(options.limit, 10) || DEFAULT_LIMIT;

        // Authenticate
        const auth = await requireAuth(config);
        const agent = auth.getAgent();
        const session = auth.getCurrentSession();

        if (!session) {
          throw new Error('Not logged in');
        }

        // Resolve handle to DID
        const recipientDid = await resolveHandle(agent, handle);

        // Get conversation
        const convoId = await getConvo(agent, recipientDid);

        if (!convoId) {
          const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
          console.log(chalk.yellow(`No conversation found with ${cleanHandle}`));
          console.log(chalk.gray('Send a message first with: bsky dm send'));
          process.exit(0);
        }

        // Get messages
        const messages = await getMessages(agent, convoId, limit);

        if (messages.length === 0) {
          const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
          console.log(chalk.yellow(`No messages in conversation with ${cleanHandle}`));
          process.exit(0);
        }

        // Format output
        if (options.json) {
          console.log(JSON.stringify(messages, null, 2));
        } else {
          const formatted = formatMessagesHuman(
            messages,
            session.did,
            handle,
            config.readConfig().colorOutput
          );
          console.log(formatted);
        }
      } catch (error: any) {
        if (error.message.includes('Not logged in')) {
          console.error(chalk.red('Error: Not logged in. Run "bsky login" first.'));
        } else {
          console.error(chalk.red(`Error: ${error.message}`));
        }
        process.exit(1);
      }
    });

  return command;
}
