import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { ConfigManager } from '../lib/config.js';
import { requireAuth } from '../lib/auth.js';

export function createSearchCommand(config: ConfigManager): Command {
  return new Command('search')
    .description('Search for users on Bluesky')
    .argument('<query>', 'Search query for finding users')
    .option('-l, --limit <number>', 'Number of results to return (default: 25, max: 100)', '25')
    .option('--json', 'Output in JSON format')
    .action(async (query: string, options) => {
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

        // Search for actors
        const response = await agent.searchActors({
          q: query,
          limit,
        });

        const actors = response.data.actors;

        // JSON output mode
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                query,
                count: actors.length,
                actors,
              },
              null,
              2
            )
          );
          return;
        }

        // Formatted output mode
        const configData = config.readConfig();
        const useColor = configData.colorOutput;

        if (actors.length === 0) {
          console.log(chalk.gray(`No users found matching "${query}"`));
          return;
        }

        // Display header
        console.log(chalk.bold(`\n🔍 Search results for "${query}"`));
        console.log(chalk.gray(`Found ${actors.length} user${actors.length === 1 ? '' : 's'}\n`));

        // Create table for results
        const table = new Table({
          head: useColor
            ? [
                chalk.cyan('Handle'),
                chalk.cyan('Display Name'),
                chalk.cyan('Bio'),
                chalk.cyan('Followers'),
              ]
            : ['Handle', 'Display Name', 'Bio', 'Followers'],
          colWidths: [30, 25, 45, 12],
          wordWrap: true,
          style: {
            head: [],
            border: useColor ? ['gray'] : [],
          },
        });

        // Add each actor to the table
        actors.forEach((actor) => {
          const handle = `@${actor.handle}`;
          const displayName = actor.displayName || '';

          // Truncate bio to first 100 chars
          let bio = actor.description || '';
          if (bio.length > 100) {
            bio = bio.substring(0, 97) + '...';
          }
          // Replace newlines with spaces in bio
          bio = bio.replace(/\n/g, ' ');

          const followers = (actor as any).followersCount !== undefined
            ? (actor as any).followersCount.toLocaleString()
            : 'N/A';

          table.push([handle, displayName, bio, followers]);
        });

        console.log(table.toString());
        console.log(''); // Extra newline for spacing
      } catch (error: any) {
        if (error.code === 'NOT_AUTHENTICATED') {
          console.error(chalk.red('Error: Not logged in. Run "bsky login" first.'));
        } else if (error.status === 401) {
          console.error(chalk.red('Error: Session expired. Please login again.'));
        } else {
          console.error(chalk.red(`Error: ${error.message || 'Failed to search users'}`));
        }
        process.exit(1);
      }
    });
}
