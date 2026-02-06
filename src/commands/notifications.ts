import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config.js';
import { requireAuth } from '../lib/auth.js';
import { OutputFormatter } from '../lib/formatter.js';

export function createNotificationsCommand(config: ConfigManager): Command {
  return new Command('notifications')
    .description('Show your notifications')
    .option('-l, --limit <number>', 'Number of notifications to fetch (default: 20)', '20')
    .option('-u, --unread', 'Show only unread notifications')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      try {
        // Require authentication
        const auth = await requireAuth(config);
        const agent = auth.getAgent();

        // Validate and parse limit
        const limit = parseInt(options.limit, 10);
        if (isNaN(limit) || limit < 1) {
          console.error(chalk.red('Error: Limit must be a positive number'));
          process.exit(1);
        }

        // Fetch notifications
        const response = await agent.listNotifications({
          limit,
        });

        // Filter for unread if requested
        let notifications = response.data.notifications;
        if (options.unread) {
          notifications = notifications.filter((n) => !n.isRead);
        }

        // JSON output mode
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                notifications,
                seenAt: response.data.seenAt,
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

        if (notifications.length === 0) {
          if (options.unread) {
            console.log(chalk.gray('No unread notifications'));
          } else {
            console.log(chalk.gray('No notifications'));
          }
          return;
        }

        // Display header
        const headerText = options.unread ? '🔔 Unread Notifications' : '🔔 Notifications';
        console.log(chalk.bold(`\n${headerText}\n`));

        // Count unread
        const unreadCount = notifications.filter((n) => !n.isRead).length;
        if (!options.unread && unreadCount > 0) {
          console.log(chalk.cyan(`  ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}\n`));
        }

        // Display each notification
        notifications.forEach((notification, index) => {
          if (index > 0) {
            console.log(formatter.formatSeparator());
          }
          console.log(formatter.formatNotification(notification));
        });

        console.log('');
      } catch (error: any) {
        if (error.code === 'NOT_AUTHENTICATED') {
          console.error(chalk.red('Error: Not logged in. Run "bsky login" first.'));
        } else if (error.status === 401) {
          console.error(chalk.red('Error: Session expired. Please login again.'));
        } else {
          console.error(chalk.red(`Error: ${error.message || 'Failed to fetch notifications'}`));
        }
        process.exit(1);
      }
    });
}
