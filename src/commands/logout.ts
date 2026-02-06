import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config.js';
import { AuthManager } from '../lib/auth.js';

export function createLogoutCommand(config: ConfigManager): Command {
  return new Command('logout').description('Logout from Bluesky').action(async () => {
    try {
      const session = config.readSession();
      if (!session) {
        console.log(chalk.yellow('Not currently logged in'));
        return;
      }

      console.log(chalk.gray(`Logging out ${session.handle}...`));

      const auth = new AuthManager(config);
      await auth.logout();

      console.log(chalk.green('✓ Successfully logged out'));
    } catch (error) {
      console.error(chalk.red(`✗ Logout failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });
}
