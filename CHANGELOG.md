# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-06

### Added

#### Phase 1: Core Foundation
- **Authentication System**
  - `bsky login` - Interactive authentication with app passwords
  - `bsky logout` - Session management and credential clearing
  - `bsky whoami` - Display authenticated user information
  - Secure session storage in `~/.config/bluesky-cli/session.json`
  - Support for custom API endpoints

- **Configuration Management**
  - Automatic configuration directory creation
  - Cross-platform config path support (macOS, Linux, Windows)
  - `config.json` for persistent settings
  - Color output toggle support

#### Phase 2: Posting & Timeline
- **Post Management**
  - `bsky post` - Create text posts with rich features:
    - Support for @mentions and URL detection
    - Image attachments (up to 4 images per post)
    - Alt text support for accessibility
    - Reply functionality with proper thread tracking
    - Quote posts
    - Stdin input support for scripting
  - `bsky delete` - Delete posts by AT URI

- **Timeline Features**
  - `bsky timeline` - View home feed with formatted output
  - `bsky posts` - View posts from specific users
  - `bsky notifications` - View and track notifications:
    - Likes, reposts, replies, mentions, follows, quotes
    - Formatted notification type display
    - Timestamp formatting

#### Phase 3: Social Features
- **User Discovery & Interaction**
  - `bsky search` - Search for users by handle or display name
  - `bsky profile` - View detailed user profiles:
    - Display name, handle, bio
    - Avatar and banner images
    - Follower/following/post counts
    - Account labels and moderation status

- **Follow Management**
  - `bsky follow` - Follow users by handle
  - `bsky unfollow` - Unfollow users by handle
  - `bsky followers` - List user's followers
  - `bsky following` - List users being followed

#### Phase 4: Direct Messages
- **DM Functionality**
  - `bsky dm list` - List all DM conversations:
    - Participant information
    - Last message preview
    - Unread message counts
    - Formatted timestamps
  - `bsky dm send` - Send direct messages:
    - Text message support
    - Stdin input support
  - `bsky dm read` - Read conversation history:
    - Chronological message display
    - Sender identification
    - Timestamp formatting

#### Phase 5: Polish & Release
- **Enhanced Error Handling**
  - Authentication state validation
  - Comprehensive input validation
  - User-friendly error messages
  - Graceful failure modes

- **Output Formatting**
  - Colored terminal output with chalk
  - Formatted tables for lists and feeds
  - JSON output mode for all commands
  - Consistent visual hierarchy

- **Documentation**
  - Comprehensive README with full command reference
  - Common workflow examples
  - Scripting and automation guides
  - Troubleshooting section
  - Contributing guidelines

### Technical Details

- **Stack**
  - TypeScript for type safety
  - Bun runtime for performance
  - @atproto/api for Bluesky integration
  - Commander.js for CLI framework
  - Chalk for terminal styling
  - cli-table3 for formatted output

- **Code Quality**
  - ESLint configuration with TypeScript support
  - Prettier for code formatting
  - TypeScript strict mode
  - Modular command architecture

### Security

- Secure credential storage using OS-specific config directories
- App password support (never stores main password)
- Session token management
- Input validation and sanitization

### Performance

- Built with Bun for fast startup and execution
- Efficient API request handling
- Minimal dependency footprint
- Optimized image upload process

## [1.0.1] - 2026-02-07

### Changed
- Renamed npm package from `bluesky-cli` to `bsky-cli` (name availability)
- Published to npm registry: `npm install -g bsky-cli`
- Added npx support: `npx bsky-cli <command>`
- Updated badges to show npm version and downloads

## [Unreleased]

### Planned Features

- Thread view command
- Repost functionality
- Like/unlike commands
- Mute/block user management
- Custom feed support
- List management
- Draft post system
- Multi-account support
- Post scheduling

---

[1.0.1]: https://github.com/agileguy/bluesky-cli/releases/tag/v1.0.1
[1.0.0]: https://github.com/agileguy/bluesky-cli/releases/tag/v1.0.0
