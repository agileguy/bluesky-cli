import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config.js';
import { requireAuth, AuthError } from '../lib/auth.js';
import { OutputFormatter } from '../lib/formatter.js';

export function createFollowingCommand(config: ConfigManager): Command {
  return new Command('following')
    .description('List users that a user follows (defaults to current user)')
    .argument('[handle]', 'User handle (e.g., @alice.bsky.social or alice.bsky.social)')
    .option(
      '-l, --limit <number>',
      'Maximum number of follows to retrieve (default: 50, max: 100)',
      '50'
    )
    .option('-c, --cursor <cursor>', 'Pagination cursor for fetching more results')
    .option('-j, --json', 'Output in JSON format')
    .action(async (handleArg: string | undefined, options) => {
      try {
        const auth = await requireAuth(config);
        const agent = auth.getAgent();

        // Parse limit
        const limit = Math.min(Math.max(1, parseInt(options.limit, 10)), 100);

        // Determine target user
        let targetDid: string;
        let targetHandle: string;

        if (handleArg) {
          // Normalize handle (remove @ if present)
          const handle = handleArg.startsWith('@') ? handleArg.slice(1) : handleArg;

          // Resolve handle to DID
          try {
            const resolved = await agent.resolveHandle({ handle });
            targetDid = resolved.data.did;
            targetHandle = handle;
          } catch (error: any) {
            if (options.json) {
              console.log(
                JSON.stringify(
                  {
                    success: false,
                    error: 'User not found',
                    handle: handle,
                  },
                  null,
                  2
                )
              );
            } else {
              console.error(chalk.red(`✗ User not found: @${handle}`));
              console.log(chalk.gray('  Check the handle and try again'));
            }
            process.exit(1);
          }
        } else {
          // Default to current user
          targetDid = agent.session?.did || '';
          targetHandle = agent.session?.handle || '';
        }

        // Fetch following
        const response = await agent.getFollows({
          actor: targetDid,
          limit: limit,
          cursor: options.cursor,
        });

        const following = response.data.follows;
        const nextCursor = response.data.cursor;

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                success: true,
                handle: targetHandle,
                did: targetDid,
                following: following.map((f) => ({
                  did: f.did,
                  handle: f.handle,
                  displayName: f.displayName || null,
                  description: f.description || null,
                  avatar: f.avatar || null,
                })),
                cursor: nextCursor || null,
                count: following.length,
              },
              null,
              2
            )
          );
        } else {
          // Human-readable output
          const configData = config.readConfig();
          const formatter = new OutputFormatter(configData.colorOutput);

          console.log(chalk.cyan(`\nUsers followed by @${targetHandle}:`));
          console.log(
            chalk.gray(`Showing ${following.length} user${following.length !== 1 ? 's' : ''}\n`)
          );

          if (following.length === 0) {
            console.log(chalk.gray('  Not following anyone'));
          } else {
            following.forEach((follow, index) => {
              console.log(formatter.formatProfile(follow));
              if (index < following.length - 1) {
                console.log(formatter.formatSeparator());
              }
            });

            // Show pagination hint
            if (nextCursor) {
              console.log('\n' + formatter.formatCursorHint(nextCursor));
            } else {
              console.log('\n' + formatter.formatCursorHint());
            }
          }
        }
      } catch (error) {
        if (error instanceof AuthError) {
          if (options.json) {
            console.log(
              JSON.stringify(
                {
                  success: false,
                  error: error.message,
                  code: error.code,
                },
                null,
                2
              )
            );
          } else {
            console.error(chalk.red(`✗ ${error.message}`));
          }
        } else {
          if (options.json) {
            console.log(
              JSON.stringify(
                {
                  success: false,
                  error: (error as Error).message,
                },
                null,
                2
              )
            );
          } else {
            console.error(chalk.red(`✗ Error: ${(error as Error).message}`));
          }
        }
        process.exit(1);
      }
    });
}
