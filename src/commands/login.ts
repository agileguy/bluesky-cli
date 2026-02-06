import { Command } from 'commander';
import chalk from 'chalk';
import { createInterface } from 'readline';
import ora from 'ora';
import { ConfigManager } from '../lib/config.js';
import { AuthManager } from '../lib/auth.js';
import { formatError, getExitCode } from '../lib/errors.js';
import { getDebugEnabled } from '../index.js';

function createReadline() {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl: ReturnType<typeof createReadline>, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function questionSecret(_rl: ReturnType<typeof createReadline>, query: string): Promise<string> {
  return new Promise((resolve) => {
    // Disable echo for password input
    const stdin = process.stdin as any;
    const originalRawMode = stdin.isRaw;

    try {
      if (stdin.setRawMode) {
        stdin.setRawMode(true);
      }

      let password = '';
      process.stdout.write(query);

      const onData = (char: Buffer) => {
        const c = char.toString();

        switch (c) {
          case '\n':
          case '\r':
          case '\u0004': // Ctrl+D
            try {
              stdin.setRawMode(originalRawMode);
              stdin.removeListener('data', onData);
            } finally {
              process.stdout.write('\n');
              resolve(password);
            }
            break;
          case '\u0003': // Ctrl+C
            try {
              stdin.setRawMode(originalRawMode);
              stdin.removeListener('data', onData);
            } finally {
              process.stdout.write('\n');
              process.exit(0);
            }
            break;
          case '\u007f': // Backspace
          case '\u0008': // Backspace
            if (password.length > 0) {
              password = password.slice(0, -1);
              process.stdout.write('\b \b');
            }
            break;
          default:
            // Ignore control characters except the ones above
            if (c.charCodeAt(0) >= 32) {
              password += c;
              process.stdout.write('*');
            }
            break;
        }
      };

      stdin.on('data', onData);
    } catch (error) {
      // Ensure cleanup happens even if setup fails
      if (stdin.setRawMode) {
        stdin.setRawMode(originalRawMode);
      }
      throw error;
    }
  });
}

export function createLoginCommand(config: ConfigManager): Command {
  return new Command('login')
    .description('Login to Bluesky')
    .option('-p, --password <password>', 'Password (not recommended for security reasons)')
    .option('-s, --service <url>', 'Custom PDS service URL (default: https://bsky.social)')
    .action(async (options) => {
      try {
        const rl = createReadline();
        let handle: string;
        let password: string;

        // Check if already logged in
        const currentSession = config.readSession();
        if (currentSession) {
          const proceed = await question(
            rl,
            chalk.yellow(`Already logged in as ${currentSession.handle}. Login again? (y/N): `)
          );

          if (proceed.toLowerCase() !== 'y') {
            rl.close();
            console.log(chalk.blue('Login cancelled.'));
            return;
          }
        }

        // Get handle
        handle = await question(rl, chalk.cyan('Handle or email: '));
        if (!handle.trim()) {
          rl.close();
          console.error(chalk.red('Error: Handle is required'));
          process.exit(1);
        }

        // Get password
        if (options.password) {
          password = options.password;
          // Validate password is not empty when using --password flag
          if (!password.trim()) {
            rl.close();
            console.error(chalk.red('Error: Password cannot be empty'));
            process.exit(1);
          }
          console.warn(chalk.yellow('Warning: Passing password via command line is insecure!'));
        } else {
          password = await questionSecret(rl, chalk.cyan('Password: '));
          if (!password.trim()) {
            rl.close();
            console.error(chalk.red('Error: Password is required'));
            process.exit(1);
          }
        }

        rl.close();

        // Attempt login with spinner
        const spinner = ora('Logging in to Bluesky...').start();

        try {
          const auth = new AuthManager(config, options.service);
          const session = await auth.login(handle.trim(), password.trim(), options.service);

          spinner.succeed('Successfully logged in!');
          console.log(chalk.gray(`  Handle: ${session.handle}`));
          console.log(chalk.gray(`  DID: ${session.did}`));
          if (options.service) {
            console.log(chalk.gray(`  Service: ${options.service}`));
          }
        } catch (loginError) {
          spinner.fail('Login failed');
          throw loginError;
        }
      } catch (error) {
        const errorMessage = formatError(error as Error, getDebugEnabled());
        console.error(chalk.red('\nError:'));
        console.error(errorMessage);
        process.exit(getExitCode(error as Error));
      }
    });
}
