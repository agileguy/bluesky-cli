import { Command } from 'commander';
import chalk from 'chalk';
import * as readline from 'readline';
import { ConfigManager } from '../lib/config.js';
import { requireAuth } from '../lib/auth.js';
import { OutputFormatter } from '../lib/output.js';

/**
 * Validates AT URI format for posts
 */
function validateAtUri(uri: string): void {
  const atUriPattern = /^at:\/\/did:plc:[a-z0-9]+\/app\.bsky\.feed\.post\/[a-z0-9]+$/;
  if (!atUriPattern.test(uri)) {
    throw new Error('Invalid AT URI format. Expected: at://did:plc:.../app.bsky.feed.post/...');
  }
}

/**
 * Prompts user for confirmation
 */
async function confirmDeletion(uri: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      chalk.yellow(
        `Are you sure you want to delete this post?\n${chalk.gray(uri)}\nType 'yes' to confirm: `
      ),
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes');
      }
    );
  });
}

/**
 * Creates the delete command
 */
export function createDeleteCommand(config: ConfigManager): Command {
  const command = new Command('delete');

  command
    .description('Delete a post from Bluesky')
    .argument('<uri>', 'AT URI of the post to delete (at://did:plc:.../app.bsky.feed.post/...)')
    .option('-f, --force', 'skip confirmation prompt')
    .option('--json', 'output as JSON')
    .action(async (uri: string, options: any) => {
      try {
        // Validate URI format
        validateAtUri(uri);

        // Authenticate
        const auth = await requireAuth(config);
        const agent = auth.getAgent();
        const session = auth.getCurrentSession();

        if (!session) {
          throw new Error('Not logged in. Run "bsky login" first.');
        }

        // Verify the post exists and belongs to the current user
        let postRecord: any;
        try {
          // Use app.bsky.feed.getPostThread to fetch post details
          const response = await agent.app.bsky.feed.getPostThread({ uri });

          if (!response.success || !response.data.thread) {
            throw new Error('Post not found');
          }

          // Extract post from thread
          const thread = response.data.thread;
          if (thread.$type !== 'app.bsky.feed.defs#threadViewPost') {
            throw new Error('Post not found');
          }

          postRecord = (thread as any).post;

          // Check if the post belongs to the current user
          if (postRecord.author.did !== session.did) {
            throw new Error('Cannot delete a post that does not belong to you');
          }
        } catch (error: any) {
          if (error.status === 404 || error.message.includes('RecordNotFound')) {
            throw new Error(
              'Post not found. It may have already been deleted or the URI is incorrect.'
            );
          }
          if (error.message.includes('Cannot delete')) {
            throw error;
          }
          throw new Error(`Failed to fetch post: ${error.message}`);
        }

        // Show post preview if in human mode
        if (!options.json) {
          console.log(chalk.blue('\nPost to delete:'));
          console.log('─'.repeat(80));
          console.log(chalk.cyan(`@${postRecord.author.handle}`));
          console.log((postRecord.record as any)?.text || '(no text)');
          console.log('─'.repeat(80));
          console.log('');
        }

        // Confirm deletion unless --force is used
        if (!options.force) {
          const confirmed = await confirmDeletion(uri);
          if (!confirmed) {
            console.log(chalk.yellow('Deletion cancelled.'));
            process.exit(0);
          }
        }

        // Delete the post
        try {
          await agent.deletePost(uri);
        } catch (error: any) {
          if (error.status === 404) {
            throw new Error('Post not found. It may have already been deleted.');
          }
          throw new Error(`Failed to delete post: ${error.message}`);
        }

        // Format output
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                success: true,
                deletedUri: uri,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            )
          );
        } else {
          const formatter = new OutputFormatter('human', config.readConfig().colorOutput);
          console.log(formatter.formatMessage('Post deleted successfully!', 'success'));
          console.log(chalk.gray(`Deleted URI: ${uri}`));
        }
      } catch (error: any) {
        if (error.message.includes('Not logged in')) {
          console.error(chalk.red('Error: Not logged in. Run "bsky login" first.'));
        } else {
          console.error(chalk.red(`Error: ${error.message}`));
        }
        process.exit(1);
      }
    });

  return command;
}
