#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from './lib/config.js';
import { formatError, getExitCode } from './lib/errors.js';
import { createLoginCommand } from './commands/login.js';
import { createLogoutCommand } from './commands/logout.js';
import { createWhoamiCommand } from './commands/whoami.js';
import { createPostCommand } from './commands/post.js';
import { createDeleteCommand } from './commands/delete.js';
import { createTimelineCommand } from './commands/timeline.js';
import { createPostsCommand } from './commands/posts.js';
import { createNotificationsCommand } from './commands/notifications.js';
import { createProfileCommand } from './commands/profile.js';
import { createSearchCommand } from './commands/search.js';
import { createFollowCommand } from './commands/follow.js';
import { createUnfollowCommand } from './commands/unfollow.js';
import { createFollowersCommand } from './commands/followers.js';
import { createFollowingCommand } from './commands/following.js';
import { createDmCommand } from './commands/dm.js';

/**
 * Bluesky CLI - Phase 5: Error Handling and Performance Polish
 *
 * A command-line interface for interacting with Bluesky/ATProto
 */

const program = new Command();

// Global debug flag state
export let isDebugEnabled = false;

export function setDebugEnabled(enabled: boolean): void {
  isDebugEnabled = enabled;
}

export function getDebugEnabled(): boolean {
  return isDebugEnabled;
}

async function main(): Promise<void> {
  // Initialize configuration manager
  const configManager = new ConfigManager();

  program
    .name('bsky')
    .description('Bluesky command-line interface for ATProto social networking')
    .version('0.1.0')
    .option('-v, --verbose', 'enable verbose output')
    .option('--debug', 'enable debug mode with full error stack traces')
    .option('--no-color', 'disable colored output');

  // Register authentication commands
  program.addCommand(createLoginCommand(configManager));
  program.addCommand(createLogoutCommand(configManager));
  program.addCommand(createWhoamiCommand(configManager));

  // Register post management commands
  program.addCommand(createPostCommand(configManager));
  program.addCommand(createDeleteCommand(configManager));

  // Register timeline and notification commands
  program.addCommand(createTimelineCommand(configManager));
  program.addCommand(createPostsCommand(configManager));
  program.addCommand(createNotificationsCommand(configManager));

  // Register social commands
  program.addCommand(createProfileCommand(configManager));
  program.addCommand(createSearchCommand(configManager));

  // Register follow management commands
  program.addCommand(createFollowCommand(configManager));
  program.addCommand(createUnfollowCommand(configManager));
  program.addCommand(createFollowersCommand(configManager));
  program.addCommand(createFollowingCommand(configManager));

  // Register direct message commands
  program.addCommand(createDmCommand(configManager));

  // Parse arguments
  try {
    await program.parseAsync(process.argv);

    // Set debug flag globally
    const options = program.opts();
    if (options.debug) {
      setDebugEnabled(true);
      console.log(chalk.yellow('Debug mode enabled - showing detailed error information'));
    }

    // If verbose mode and no subcommand, show configuration status
    if (options.verbose && process.argv.length === 2) {
      const config = configManager.readConfig();
      console.log(chalk.cyan('Configuration loaded successfully:'));
      console.log(chalk.gray(`  Config directory: ${configManager.getConfigDir()}`));
      console.log(chalk.gray(`  Config file: ${configManager.getConfigPath()}`));
      console.log(chalk.gray(`  Session file: ${configManager.getSessionPath()}`));
      console.log(chalk.gray(`  API Endpoint: ${config.apiEndpoint}`));
      console.log(chalk.gray(`  Color Output: ${config.colorOutput}`));

      // Check for existing session
      const session = configManager.readSession();
      if (session) {
        console.log(chalk.green(`  Authenticated as: ${session.handle}`));
      }
    }

    // Show help if no commands provided
    if (process.argv.length === 2) {
      program.help();
    }
  } catch (error) {
    const errorMessage = formatError(error as Error, isDebugEnabled);
    console.error(chalk.red('Error:'));
    console.error(errorMessage);
    process.exit(getExitCode(error as Error));
  }
}

main().catch((error) => {
  const errorMessage = formatError(error as Error, isDebugEnabled);
  console.error(chalk.red('Fatal error:'));
  console.error(errorMessage);
  process.exit(getExitCode(error as Error));
});
