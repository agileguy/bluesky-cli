import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config.js';
import { requireAuth } from '../lib/auth.js';
import { ChatClient, ChatError } from '../lib/chat.js';
import { OutputFormatter } from '../lib/formatter.js';

export function createDmListCommand(config: ConfigManager): Command {
  return new Command('list')
    .description('List your direct message conversations')
    .option('-l, --limit <number>', 'Number of conversations to fetch (default: 20)', '20')
    .option('-u, --unread', 'Show only unread conversations')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      try {
        // Require authentication
        const auth = await requireAuth(config);
        const agent = auth.getAgent();
        const session = auth.getCurrentSession();

        if (!session) {
          console.error(chalk.red('Error: Not logged in. Run "bsky login" first.'));
          process.exit(1);
        }

        // Validate and parse limit
        const limit = parseInt(options.limit, 10);
        if (isNaN(limit) || limit < 1) {
          console.error(chalk.red('Error: Limit must be a positive number'));
          process.exit(1);
        }

        // Create chat client
        const chatClient = new ChatClient(agent);

        // Fetch conversations
        const { convos, cursor } = await chatClient.getConvos({
          limit,
          unreadOnly: options.unread,
        });

        // JSON output mode
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                convos,
                cursor,
              },
              null,
              2
            )
          );
          return;
        }

        // Formatted output mode
        const configData = config.readConfig();
        const formatter = new OutputFormatter(configData.colorOutput);

        if (convos.length === 0) {
          if (options.unread) {
            console.log(chalk.gray('No unread conversations'));
          } else {
            console.log(chalk.gray('No conversations'));
          }
          return;
        }

        // Display header
        const headerText = options.unread ? 'Unread Direct Messages' : 'Direct Messages';
        console.log(chalk.bold(`\n${headerText}`));
        console.log(chalk.gray('─'.repeat(50)));

        // Count unread if not filtering
        if (!options.unread) {
          const unreadCount = convos.filter((c) => c.unreadCount > 0).length;
          if (unreadCount > 0) {
            console.log(
              chalk.cyan(`${unreadCount} unread conversation${unreadCount !== 1 ? 's' : ''}\n`)
            );
          } else {
            console.log('');
          }
        } else {
          console.log('');
        }

        // Display each conversation
        convos.forEach((convo, index) => {
          if (index > 0) {
            console.log('');
          }
          console.log(formatter.formatConversation(convo, session.did));
        });

        console.log('');

        // Show cursor hint for pagination
        if (cursor) {
          console.log(formatter.formatCursorHint(cursor));
          console.log('');
        }
      } catch (error: any) {
        if (error instanceof ChatError) {
          switch (error.code) {
            case 'SESSION_EXPIRED':
              console.error(chalk.red('Error: Session expired. Please login again.'));
              break;
            case 'DM_NOT_ENABLED':
              console.error(
                chalk.red('Error: Direct messaging is not enabled for your account.')
              );
              break;
            case 'RATE_LIMIT_EXCEEDED':
              console.error(chalk.red(`Error: ${error.message}`));
              break;
            case 'NETWORK_ERROR':
              console.error(chalk.red('Error: Network error - check your connection.'));
              break;
            default:
              console.error(chalk.red(`Error: ${error.message}`));
          }
        } else if (error.code === 'NOT_AUTHENTICATED') {
          console.error(chalk.red('Error: Not logged in. Run "bsky login" first.'));
        } else if (error.status === 401) {
          console.error(chalk.red('Error: Session expired. Please login again.'));
        } else {
          console.error(chalk.red(`Error: ${error.message || 'Failed to fetch conversations'}`));
        }
        process.exit(1);
      }
    });
}
