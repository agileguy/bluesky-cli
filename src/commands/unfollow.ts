import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config.js';
import { requireAuth, AuthError } from '../lib/auth.js';

/**
 * Prompts user for confirmation
 */
async function confirm(message: string): Promise<boolean> {
  process.stdout.write(chalk.yellow(`${message} (y/N): `));

  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      const answer = data.toString().trim().toLowerCase();
      resolve(answer === 'y' || answer === 'yes');
    });
  });
}

export function createUnfollowCommand(config: ConfigManager): Command {
  return new Command('unfollow')
    .description('Unfollow a user by handle')
    .argument('<handle>', 'User handle to unfollow (e.g., @alice.bsky.social or alice.bsky.social)')
    .option('-f, --force', 'Skip confirmation prompt')
    .option('-j, --json', 'Output in JSON format')
    .action(async (handleArg: string, options) => {
      try {
        const auth = await requireAuth(config);
        const agent = auth.getAgent();

        // Normalize handle (remove @ if present)
        const handle = handleArg.startsWith('@') ? handleArg.slice(1) : handleArg;

        // Resolve handle to DID
        let did: string;
        try {
          const resolved = await agent.resolveHandle({ handle });
          did = resolved.data.did;
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

        // Look up existing follow record
        const existingFollows = await agent.getFollows({ actor: agent.session?.did || '' });
        const followRecord = existingFollows.data.follows.find((f) => f.did === did);

        if (!followRecord) {
          if (options.json) {
            console.log(
              JSON.stringify(
                {
                  success: false,
                  error: 'Not following user',
                  handle: handle,
                  did: did,
                },
                null,
                2
              )
            );
          } else {
            console.log(chalk.yellow(`Not following @${handle}`));
          }
          return;
        }

        // Confirmation prompt (unless --force or --json)
        if (!options.force && !options.json) {
          const displayName = followRecord.displayName || handle;
          const confirmed = await confirm(`Unfollow @${handle} (${displayName})?`);

          if (!confirmed) {
            console.log(chalk.gray('Cancelled'));
            return;
          }
        }

        // Extract follow URI from viewer data
        const followUri = (followRecord as any).viewer?.following;

        if (!followUri) {
          // Fallback: fetch full profile to get follow URI
          const profile = await agent.getProfile({ actor: did });
          const profileFollowUri = (profile.data as any).viewer?.following;

          if (!profileFollowUri) {
            if (options.json) {
              console.log(
                JSON.stringify(
                  {
                    success: false,
                    error: 'Follow record not found',
                    handle: handle,
                  },
                  null,
                  2
                )
              );
            } else {
              console.error(chalk.red(`✗ Follow record not found for @${handle}`));
            }
            process.exit(1);
          }

          await agent.deleteFollow(profileFollowUri);
        } else {
          await agent.deleteFollow(followUri);
        }

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                success: true,
                handle: handle,
                did: did,
                displayName: followRecord.displayName || handle,
              },
              null,
              2
            )
          );
        } else {
          console.log(chalk.green(`✓ Unfollowed @${handle}`));
          if (followRecord.displayName) {
            console.log(chalk.gray(`  ${followRecord.displayName}`));
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
