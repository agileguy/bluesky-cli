import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config.js';
import { requireAuth, AuthError } from '../lib/auth.js';

export function createWhoamiCommand(config: ConfigManager): Command {
  return new Command('whoami')
    .description('Show current logged in user')
    .option('-j, --json', 'Output in JSON format')
    .action(async (options) => {
      try {
        const session = config.readSession();

        if (!session) {
          if (options.json) {
            console.log(JSON.stringify({ authenticated: false }, null, 2));
          } else {
            console.log(chalk.yellow('Not logged in'));
            console.log(chalk.gray('Run "bsky login" to authenticate'));
          }
          return;
        }

        const auth = await requireAuth(config);

        // Validate session is still active
        const isValid = await auth.validateSession();

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                authenticated: isValid,
                handle: session.handle,
                did: session.did,
                lastUsed: session.lastUsed,
              },
              null,
              2
            )
          );
        } else {
          console.log(chalk.green('Logged in as:'));
          console.log(chalk.cyan(`  Handle: ${session.handle}`));
          console.log(chalk.gray(`  DID: ${session.did}`));
          console.log(chalk.gray(`  Last used: ${new Date(session.lastUsed).toLocaleString()}`));
          console.log(
            chalk.gray(`  Session: ${isValid ? chalk.green('Valid') : chalk.red('Expired')}`)
          );
        }
      } catch (error) {
        if (error instanceof AuthError) {
          if (options.json) {
            console.log(
              JSON.stringify(
                {
                  authenticated: false,
                  error: error.message,
                  code: error.code,
                },
                null,
                2
              )
            );
          } else {
            console.error(chalk.red(`✗ ${error.message}`));
            if (error.code === 'SESSION_EXPIRED') {
              console.log(chalk.gray('Run "bsky login" to authenticate again'));
            }
          }
        } else {
          if (options.json) {
            console.log(
              JSON.stringify(
                {
                  authenticated: false,
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
