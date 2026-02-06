import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config.js';
import { requireAuth } from '../lib/auth.js';
import { AppBskyActorDefs } from '@atproto/api';

/**
 * Format a profile in a detailed box format
 */
function formatDetailedProfile(
  profile: AppBskyActorDefs.ProfileViewDetailed,
  useColor: boolean = true
): string {
  const lines: string[] = [];

  // Top border
  lines.push('╭─────────────────────────────────────╮');

  // Display name and handle
  const displayName = profile.displayName || profile.handle;
  const handleText = `@${profile.handle}`;
  const titleLine = `│  ${displayName} (${handleText})`;
  const paddingNeeded = 40 - titleLine.length;
  lines.push(titleLine + ' '.repeat(Math.max(0, paddingNeeded)) + '│');

  // Separator
  lines.push('├─────────────────────────────────────┤');

  // Bio/description
  if (profile.description) {
    const bioLines = profile.description.split('\n');
    bioLines.forEach((bioLine) => {
      // Wrap long lines to fit within the box (max ~35 chars)
      const words = bioLine.split(' ');
      let currentLine = '';

      words.forEach((word) => {
        if (currentLine.length + word.length + 1 <= 35) {
          currentLine += (currentLine ? ' ' : '') + word;
        } else {
          if (currentLine) {
            const line = `│  ${currentLine}`;
            const padding = 40 - line.length;
            lines.push(line + ' '.repeat(Math.max(0, padding)) + '│');
          }
          currentLine = word;
        }
      });

      if (currentLine) {
        const line = `│  ${currentLine}`;
        const padding = 40 - line.length;
        lines.push(line + ' '.repeat(Math.max(0, padding)) + '│');
      }
    });
    lines.push('│                                     │');
  }

  // Stats
  const postsCount = profile.postsCount || 0;
  const followersCount = profile.followersCount || 0;
  const followsCount = profile.followsCount || 0;

  const postsLine = `│  📝 ${postsCount.toLocaleString()} posts`;
  const postsPadding = 40 - postsLine.length;
  lines.push(postsLine + ' '.repeat(Math.max(0, postsPadding)) + '│');

  const followersLine = `│  👥 ${followersCount.toLocaleString()} followers`;
  const followersPadding = 40 - followersLine.length;
  lines.push(followersLine + ' '.repeat(Math.max(0, followersPadding)) + '│');

  const followingLine = `│  👤 ${followsCount.toLocaleString()} following`;
  const followingPadding = 40 - followingLine.length;
  lines.push(followingLine + ' '.repeat(Math.max(0, followingPadding)) + '│');

  // Website/links if available
  if ((profile as any).website) {
    lines.push('│                                     │');
    const websiteLine = `│  🔗 ${(profile as any).website}`;
    const websitePadding = 40 - websiteLine.length;
    lines.push(
      websiteLine.substring(0, 39) +
        ' '.repeat(Math.max(0, Math.min(websitePadding, 40 - websiteLine.length))) +
        '│'
    );
  }

  // Account creation date (if available in indexedAt)
  if (profile.createdAt) {
    const createdDate = new Date(profile.createdAt);
    const monthYear = createdDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    lines.push('│                                     │');
    const joinedLine = `│  📅 Joined: ${monthYear}`;
    const joinedPadding = 40 - joinedLine.length;
    lines.push(joinedLine + ' '.repeat(Math.max(0, joinedPadding)) + '│');
  }

  // Relationship status (viewer perspective)
  if (profile.viewer) {
    const relationships: string[] = [];

    if (profile.viewer.following) {
      relationships.push('You follow');
    }
    if (profile.viewer.followedBy) {
      relationships.push('Follows you');
    }

    if (relationships.length > 0) {
      lines.push('│                                     │');
      const relationLine = `│  ✅ ${relationships.join(' · ')}`;
      const relationPadding = 40 - relationLine.length;
      lines.push(relationLine + ' '.repeat(Math.max(0, relationPadding)) + '│');
    }
  }

  // Bottom border
  lines.push('╰─────────────────────────────────────╯');

  // Apply color if enabled
  if (useColor) {
    return lines
      .map((line) => {
        if (line.includes('╭') || line.includes('╰') || line.includes('├')) {
          return chalk.cyan(line);
        } else if (line.includes('│')) {
          // Color the borders but keep content normal
          return line.replace(/^│/, chalk.cyan('│')).replace(/│$/, chalk.cyan('│'));
        }
        return line;
      })
      .join('\n');
  }

  return lines.join('\n');
}

export function createProfileCommand(config: ConfigManager): Command {
  return new Command('profile')
    .description('Show detailed profile information for a user')
    .argument('<handle>', 'User handle (e.g., @alice.bsky.social or alice.bsky.social)')
    .option('--json', 'Output in JSON format')
    .action(async (handleArg: string, options) => {
      try {
        // Require authentication
        const auth = await requireAuth(config);
        const agent = auth.getAgent();

        // Clean up handle (remove @ if present)
        const handle = handleArg.startsWith('@') ? handleArg.substring(1) : handleArg;

        // Fetch profile
        let profileResponse;
        try {
          profileResponse = await agent.getProfile({ actor: handle });
        } catch (error: any) {
          if (error.status === 400 || error.message?.includes('Unable to resolve')) {
            console.error(chalk.red(`Error: Profile "${handle}" not found`));
          } else {
            console.error(chalk.red(`Error: Failed to fetch profile for "${handle}"`));
          }
          process.exit(1);
        }

        const profile = profileResponse.data;

        // JSON output mode
        if (options.json) {
          console.log(JSON.stringify(profile, null, 2));
          return;
        }

        // Formatted output mode
        const configData = config.readConfig();
        const useColor = configData.colorOutput;

        console.log('\n' + formatDetailedProfile(profile, useColor) + '\n');

        // Avatar URL (as additional info below the box)
        if (profile.avatar) {
          const avatarLine = useColor
            ? chalk.gray(`Avatar: ${profile.avatar}`)
            : `Avatar: ${profile.avatar}`;
          console.log(avatarLine);
        }

        // DID (for reference)
        const didLine = useColor ? chalk.gray(`DID: ${profile.did}`) : `DID: ${profile.did}`;
        console.log(didLine + '\n');
      } catch (error: any) {
        if (error.code === 'NOT_AUTHENTICATED') {
          console.error(chalk.red('Error: Not logged in. Run "bsky login" first.'));
        } else if (error.status === 401) {
          console.error(chalk.red('Error: Session expired. Please login again.'));
        } else {
          console.error(chalk.red(`Error: ${error.message || 'Failed to fetch profile'}`));
        }
        process.exit(1);
      }
    });
}
