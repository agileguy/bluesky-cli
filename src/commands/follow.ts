import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config.js';
import { requireAuth, AuthError } from '../lib/auth.js';

export function createFollowCommand(config: ConfigManager): Command {
  return new Command('follow')
    .description('Follow a user by handle')
    .argument('<handle>', 'User handle to follow (e.g., @alice.bsky.social or alice.bsky.social)')
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

        // Get user profile to verify and show info
        const profile = await agent.getProfile({ actor: did });

        // Check if already following
        const existingFollows = await agent.getFollows({ actor: agent.session?.did || '' });
        const alreadyFollowing = existingFollows.data.follows.some((f) => f.did === did);

        if (alreadyFollowing) {
          if (options.json) {
            console.log(
              JSON.stringify(
                {
                  success: false,
                  error: 'Already following',
                  handle: handle,
                  did: did,
                  displayName: profile.data.displayName || handle,
                },
                null,
                2
              )
            );
          } else {
            console.log(chalk.yellow(`Already following @${handle}`));
            console.log(chalk.gray(`  ${profile.data.displayName || handle}`));
          }
          return;
        }

        // Create follow record
        await agent.follow(did);

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                success: true,
                handle: handle,
                did: did,
                displayName: profile.data.displayName || handle,
                description: profile.data.description || null,
              },
              null,
              2
            )
          );
        } else {
          console.log(chalk.green(`✓ Now following @${handle}`));
          if (profile.data.displayName) {
            console.log(chalk.gray(`  ${profile.data.displayName}`));
          }
          if (profile.data.description) {
            const shortBio =
              profile.data.description.length > 100
                ? profile.data.description.slice(0, 97) + '...'
                : profile.data.description;
            console.log(chalk.gray(`  ${shortBio}`));
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
