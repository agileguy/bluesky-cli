import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config.js';
import { requireAuth } from '../lib/auth.js';
import { OutputFormatter } from '../lib/output.js';

/**
 * Maximum DM text length
 */
const MAX_DM_LENGTH = 1000;

/**
 * Reads message text from stdin or returns provided text
 */
async function readMessageText(text?: string): Promise<string> {
  if (text) {
    return text;
  }

  // Check if stdin is being piped
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8').trim();
  }

  throw new Error('No message text provided. Use: bsky dm send @handle "text" or echo "text" | bsky dm send @handle');
}

/**
 * Validates message text
 */
function validateMessageText(text: string): void {
  if (!text || text.trim().length === 0) {
    throw new Error('Message text cannot be empty');
  }

  if (text.length > MAX_DM_LENGTH) {
    throw new Error(
      `Message text exceeds maximum length of ${MAX_DM_LENGTH} characters (got ${text.length})`
    );
  }
}

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
 * Gets or creates a conversation with the specified user
 */
async function getOrCreateConvo(agent: any, memberDid: string): Promise<string> {
  try {
    // Use the chat API endpoint with proper headers
    const response = await agent.api.chat.bsky.convo.getConvoForMembers(
      { members: [memberDid] },
      { headers: { 'Atproto-Proxy': 'did:web:api.bsky.chat#bsky_chat' } }
    );

    if (!response.success || !response.data.convo) {
      throw new Error('Failed to get or create conversation');
    }

    return response.data.convo.id;
  } catch (error: any) {
    throw new Error(`Failed to get conversation: ${error.message}`);
  }
}

/**
 * Sends a message to a conversation
 */
async function sendMessage(agent: any, convoId: string, text: string): Promise<any> {
  try {
    const message = {
      text: text,
    };

    const response = await agent.api.chat.bsky.convo.sendMessage(
      {
        convoId: convoId,
        message: message,
      },
      { headers: { 'Atproto-Proxy': 'did:web:api.bsky.chat#bsky_chat' } }
    );

    if (!response.success) {
      throw new Error('Failed to send message');
    }

    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to send message: ${error.message}`);
  }
}

/**
 * Creates the dm send command
 */
export function createDmSendCommand(config: ConfigManager): Command {
  const command = new Command('send');

  command
    .description('Send a direct message to a user')
    .argument('<handle>', 'recipient handle (e.g., @alice.bsky.social)')
    .argument('[message]', 'message text (or read from stdin)')
    .option('--json', 'output as JSON')
    .action(async (handle: string, message: string | undefined, options: any) => {
      try {
        // Read message text
        const messageText = await readMessageText(message);
        validateMessageText(messageText);

        // Authenticate
        const auth = await requireAuth(config);
        const agent = auth.getAgent();

        // Resolve handle to DID
        const recipientDid = await resolveHandle(agent, handle);

        // Get or create conversation
        const convoId = await getOrCreateConvo(agent, recipientDid);

        // Send the message
        const sentMessage = await sendMessage(agent, convoId, messageText);

        // Format output
        const formatter = new OutputFormatter(
          options.json ? 'json' : 'human',
          config.readConfig().colorOutput
        );

        if (options.json) {
          console.log(JSON.stringify(sentMessage, null, 2));
        } else {
          console.log(formatter.formatMessage('Message sent successfully!', 'success'));
          const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
          console.log(chalk.gray(`To: ${cleanHandle}`));

          // Show preview of message (truncated if long)
          const preview = messageText.length > 50
            ? messageText.substring(0, 50) + '...'
            : messageText;
          console.log(chalk.gray(`Message: ${preview}`));
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
