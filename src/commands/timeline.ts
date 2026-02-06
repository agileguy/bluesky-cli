import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config.js';
import { requireAuth } from '../lib/auth.js';
import { OutputFormatter } from '../lib/formatter.js';

export function createTimelineCommand(config: ConfigManager): Command {
  return new Command('timeline')
    .description('Show your home feed timeline')
    .option('-l, --limit <number>', 'Number of posts to fetch (default: 20, max: 100)', '20')
    .option('-c, --cursor <cursor>', 'Pagination cursor for next page')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      try {
        // Require authentication
        const auth = await requireAuth(config);
        const agent = auth.getAgent();

        // Validate and parse limit
        const limit = parseInt(options.limit, 10);
        if (isNaN(limit) || limit < 1 || limit > 100) {
          console.error(chalk.red('Error: Limit must be between 1 and 100'));
          process.exit(1);
        }

        // Fetch timeline
        const response = await agent.getTimeline({
          limit,
          cursor: options.cursor,
        });

        // JSON output mode
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                feed: response.data.feed,
                cursor: response.data.cursor,
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

        if (response.data.feed.length === 0) {
          console.log(chalk.gray('No posts in timeline'));
          return;
        }

        // Display header
        console.log(chalk.bold('\n📰 Home Timeline\n'));

        // Display each post
        response.data.feed.forEach((feedPost, index) => {
          if (index > 0) {
            console.log(formatter.formatSeparator());
          }
          console.log(formatter.formatPost(feedPost, true));
        });

        // Display pagination hint
        console.log('\n' + formatter.formatSeparator());
        console.log(formatter.formatCursorHint(response.data.cursor));
        console.log('');
      } catch (error: any) {
        if (error.code === 'NOT_AUTHENTICATED') {
          console.error(chalk.red('Error: Not logged in. Run "bsky login" first.'));
        } else if (error.status === 401) {
          console.error(chalk.red('Error: Session expired. Please login again.'));
        } else {
          console.error(chalk.red(`Error: ${error.message || 'Failed to fetch timeline'}`));
        }
        process.exit(1);
      }
    });
}
