import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../lib/config.js';
import { requireAuth } from '../lib/auth.js';
import { OutputFormatter } from '../lib/formatter.js';
import { formatError, getExitCode, ValidationError, NotFoundError } from '../lib/errors.js';
import { getDebugEnabled } from '../index.js';
import { withRetry, RetryProfiles } from '../lib/retry.js';

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
          throw new ValidationError('Limit must be between 1 and 100', { code: 'INVALID_LIMIT' });
        }

        // Resolve handle to DID with spinner
        const spinner = ora(`Resolving @${handle}...`).start();

        let actor: string;
        try {
          const resolveResponse = await withRetry(() => agent.resolveHandle({ handle }), {
            ...RetryProfiles.fast,
            onRetry: (attempt) => {
              spinner.text = `Resolving @${handle}... (retry ${attempt})`;
            },
          });
          actor = resolveResponse.data.did;
          spinner.succeed(`Found @${handle}`);
        } catch (error: any) {
          spinner.fail(`Could not resolve @${handle}`);
          if (error.status === 400 || error.message?.includes('Unable to resolve')) {
            throw new NotFoundError(`Handle "${handle}" not found`, { code: 'HANDLE_NOT_FOUND' });
          }
          throw error;
        }

        // Fetch author feed with spinner
        spinner.start(`Fetching posts from @${handle}...`);

        const response = await withRetry(
          () =>
            agent.getAuthorFeed({
              actor,
              limit,
              cursor: options.cursor,
            }),
          {
            ...RetryProfiles.standard,
            onRetry: (attempt) => {
              spinner.text = `Fetching posts from @${handle}... (retry ${attempt})`;
            },
          }
        );

        spinner.stop();

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
        const errorMessage = formatError(error as Error, getDebugEnabled());
        console.error(chalk.red('Error:'));
        console.error(errorMessage);
        process.exit(getExitCode(error as Error));
      }
    });
}
