import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config.js';
import { requireAuth } from '../lib/auth.js';
import { OutputFormatter } from '../lib/formatter.js';

export function createPostsCommand(config: ConfigManager): Command {
  return new Command('posts')
    .description('Show posts from a specific user')
    .argument('<handle>', 'User handle (e.g., @alice.bsky.social or alice.bsky.social)')
    .option('-l, --limit <number>', 'Number of posts to fetch (default: 20, max: 100)', '20')
    .option('-c, --cursor <cursor>', 'Pagination cursor for next page')
    .option('--json', 'Output in JSON format')
    .action(async (handleArg: string, options) => {
      try {
        // Require authentication
        const auth = await requireAuth(config);
        const agent = auth.getAgent();

        // Clean up handle (remove @ if present)
        const handle = handleArg.startsWith('@') ? handleArg.substring(1) : handleArg;

        // Validate and parse limit
        const limit = parseInt(options.limit, 10);
        if (isNaN(limit) || limit < 1 || limit > 100) {
          console.error(chalk.red('Error: Limit must be between 1 and 100'));
          process.exit(1);
        }

        // Resolve handle to DID
        let actor: string;
        try {
          const resolveResponse = await agent.resolveHandle({ handle });
          actor = resolveResponse.data.did;
        } catch (error: any) {
          if (error.status === 400 || error.message?.includes('Unable to resolve')) {
            console.error(chalk.red(`Error: Handle "${handle}" not found`));
          } else {
            console.error(chalk.red(`Error: Failed to resolve handle "${handle}"`));
          }
          process.exit(1);
        }

        // Fetch author feed
        const response = await agent.getAuthorFeed({
          actor,
          limit,
          cursor: options.cursor,
        });

        // JSON output mode
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                handle,
                did: actor,
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
          console.log(chalk.gray(`No posts found for @${handle}`));
          return;
        }

        // Display header
        console.log(chalk.bold(`\n📝 Posts by @${handle}\n`));

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
          console.error(chalk.red(`Error: ${error.message || 'Failed to fetch posts'}`));
        }
        process.exit(1);
      }
    });
}
