#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from './lib/config.js';
import { createLoginCommand } from './commands/login.js';
import { createLogoutCommand } from './commands/logout.js';
import { createWhoamiCommand } from './commands/whoami.js';

/**
 * Bluesky CLI - Phase 1: Core Foundation
 *
 * A command-line interface for interacting with Bluesky/ATProto
 */

const program = new Command();

async function main(): Promise<void> {
  // Initialize configuration manager
  const configManager = new ConfigManager();

  program
    .name('bsky')
    .description('Bluesky command-line interface for ATProto social networking')
    .version('0.1.0')
    .option('-v, --verbose', 'enable verbose output')
    .option('--no-color', 'disable colored output');

  // Register authentication commands
  program.addCommand(createLoginCommand(configManager));
  program.addCommand(createLogoutCommand(configManager));
  program.addCommand(createWhoamiCommand(configManager));

  // Parse arguments
  try {
    await program.parseAsync(process.argv);

    // If verbose mode and no subcommand, show configuration status
    const options = program.opts();
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
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(chalk.red(`Fatal error: ${error.message}`));
  process.exit(1);
});
