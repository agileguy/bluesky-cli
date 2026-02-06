import { Command } from 'commander';
import { ConfigManager } from '../lib/config.js';
import { createDmListCommand } from './dm-list.js';
import { createDmSendCommand } from './dm-send.js';
import { createDmReadCommand } from './dm-read.js';

/**
 * Creates the dm parent command
 */
export function createDmCommand(config: ConfigManager): Command {
  const command = new Command('dm');

  command
    .description('Direct message commands')
    .addCommand(createDmListCommand(config))
    .addCommand(createDmSendCommand(config))
    .addCommand(createDmReadCommand(config));

  return command;
}
