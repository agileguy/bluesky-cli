# Bluesky CLI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/bluesky-cli)

A powerful command-line interface for the Bluesky social network, built on the AT Protocol. Post, interact, and manage your Bluesky presence directly from your terminal.

## Features

- 🔐 **Authentication** - Secure login with app passwords, persistent session management
- 📝 **Posting** - Create posts with images, replies, and quotes
- 📰 **Timeline** - View your home feed, notifications, and user posts
- 👥 **Social** - Follow/unfollow users, search, view profiles and follower lists
- 💬 **Direct Messages** - Send and receive DMs in conversations
- 🎨 **Rich Output** - Colored, formatted output with JSON support
- ⚡ **Fast** - Built with Bun for blazing-fast performance

## Installation

### Using Bun (Recommended)

```bash
bun install -g bluesky-cli
```

### Using npm

```bash
npm install -g bluesky-cli
```

## Quick Start

```bash
# Login to your Bluesky account
bsky login

# Post a message
bsky post "Hello from the command line!"

# View your home timeline
bsky timeline

# Follow someone
bsky follow @user.bsky.social

# Send a direct message
bsky dm send @user.bsky.social "Hey there!"

# View your DM conversations
bsky dm list

# Read a conversation
bsky dm read @user.bsky.social
```

## Command Reference

### Authentication Commands

#### `bsky login`
Authenticate with your Bluesky account using an app password.

```bash
bsky login
# Interactive prompts for handle and app password
```

**Options:**
- `--json` - Output response as JSON

**Notes:**
- Creates an app password at: https://bsky.app/settings/app-passwords
- Session is stored securely in `~/.config/bluesky-cli/session.json`

#### `bsky logout`
Clear your authentication session.

```bash
bsky logout
```

**Options:**
- `--json` - Output response as JSON

#### `bsky whoami`
Display information about the currently authenticated user.

```bash
bsky whoami
```

**Options:**
- `--json` - Output response as JSON

### Posting Commands

#### `bsky post`
Create a new post on Bluesky.

```bash
# Post text
bsky post "Your message here"

# Post from stdin
echo "Your message" | bsky post

# Post with image
bsky post "Check this out!" --image ./photo.jpg

# Post with multiple images and alt text
bsky post "Gallery" --image img1.jpg --image img2.jpg --alt "First" --alt "Second"

# Reply to a post
bsky post "Great point!" --reply-to at://did:plc:.../app.bsky.feed.post/...

# Quote a post
bsky post "Interesting take" --quote at://did:plc:.../app.bsky.feed.post/...
```

**Arguments:**
- `[text]` - Post text (or read from stdin if not provided)

**Options:**
- `-i, --image <path>` - Attach image (can be used up to 4 times)
- `-a, --alt <text>` - Alt text for images (in order, one per image)
- `-r, --reply-to <uri>` - AT URI of post to reply to
- `-q, --quote <uri>` - AT URI of post to quote
- `--json` - Output response as JSON

**Limits:**
- Max post length: 300 characters
- Max images: 4 per post
- Max image size: 1MB
- Supported formats: JPEG, PNG, WebP, GIF

#### `bsky delete`
Delete a post by its AT URI.

```bash
bsky delete at://did:plc:.../app.bsky.feed.post/...
```

**Arguments:**
- `<uri>` - AT URI of the post to delete

**Options:**
- `--json` - Output response as JSON

### Timeline Commands

#### `bsky timeline`
View your home timeline feed.

```bash
# View latest posts
bsky timeline

# View more posts
bsky timeline --limit 50

# JSON output
bsky timeline --json
```

**Options:**
- `-l, --limit <number>` - Number of posts to fetch (default: 20)
- `--json` - Output response as JSON

#### `bsky posts`
View posts from a specific user.

```bash
# View your own posts
bsky posts

# View another user's posts
bsky posts @user.bsky.social

# View more posts
bsky posts @user.bsky.social --limit 50
```

**Arguments:**
- `[handle]` - User handle (defaults to authenticated user)

**Options:**
- `-l, --limit <number>` - Number of posts to fetch (default: 20)
- `--json` - Output response as JSON

#### `bsky notifications`
View your notifications.

```bash
# View latest notifications
bsky notifications

# View more notifications
bsky notifications --limit 50

# JSON output
bsky notifications --json
```

**Options:**
- `-l, --limit <number>` - Number of notifications to fetch (default: 20)
- `--json` - Output response as JSON

**Notification Types:**
- Likes on your posts
- Reposts of your posts
- Replies to your posts
- Mentions of your handle
- Follows from other users
- Quotes of your posts

### Social Commands

#### `bsky follow`
Follow a user.

```bash
bsky follow @user.bsky.social
```

**Arguments:**
- `<handle>` - User handle to follow

**Options:**
- `--json` - Output response as JSON

#### `bsky unfollow`
Unfollow a user.

```bash
bsky unfollow @user.bsky.social
```

**Arguments:**
- `<handle>` - User handle to unfollow

**Options:**
- `--json` - Output response as JSON

#### `bsky followers`
View followers of a user.

```bash
# View your own followers
bsky followers

# View another user's followers
bsky followers @user.bsky.social

# View more followers
bsky followers @user.bsky.social --limit 100
```

**Arguments:**
- `[handle]` - User handle (defaults to authenticated user)

**Options:**
- `-l, --limit <number>` - Number of followers to fetch (default: 50)
- `--json` - Output response as JSON

#### `bsky following`
View users that a user is following.

```bash
# View who you're following
bsky following

# View who another user is following
bsky following @user.bsky.social

# View more
bsky following @user.bsky.social --limit 100
```

**Arguments:**
- `[handle]` - User handle (defaults to authenticated user)

**Options:**
- `-l, --limit <number>` - Number of users to fetch (default: 50)
- `--json` - Output response as JSON

#### `bsky profile`
View detailed profile information for a user.

```bash
# View your own profile
bsky profile

# View another user's profile
bsky profile @user.bsky.social
```

**Arguments:**
- `[handle]` - User handle (defaults to authenticated user)

**Options:**
- `--json` - Output response as JSON

**Profile Information:**
- Display name
- Handle
- Description/bio
- Avatar and banner images
- Follower/following counts
- Post count
- Labels and moderation status

#### `bsky search`
Search for users by handle or display name.

```bash
# Search for users
bsky search "Alice"

# Get more results
bsky search "Alice" --limit 50

# JSON output
bsky search "Alice" --json
```

**Arguments:**
- `<query>` - Search query

**Options:**
- `-l, --limit <number>` - Number of results to fetch (default: 20)
- `--json` - Output response as JSON

### Direct Message Commands

#### `bsky dm list`
List your direct message conversations.

```bash
# View conversations
bsky dm list

# View more conversations
bsky dm list --limit 50

# JSON output
bsky dm list --json
```

**Options:**
- `-l, --limit <number>` - Number of conversations to fetch (default: 20)
- `--json` - Output response as JSON

**Output:**
- Conversation participants
- Last message preview
- Timestamp of last message
- Unread count

#### `bsky dm send`
Send a direct message to a user.

```bash
# Send a message
bsky dm send @user.bsky.social "Hello there!"

# Send from stdin
echo "Hello there!" | bsky dm send @user.bsky.social
```

**Arguments:**
- `<handle>` - User handle to message
- `[message]` - Message text (or read from stdin)

**Options:**
- `--json` - Output response as JSON

#### `bsky dm read`
Read messages in a conversation with a user.

```bash
# Read messages
bsky dm read @user.bsky.social

# Read more messages
bsky dm read @user.bsky.social --limit 100

# JSON output
bsky dm read @user.bsky.social --json
```

**Arguments:**
- `<handle>` - User handle of conversation

**Options:**
- `-l, --limit <number>` - Number of messages to fetch (default: 50)
- `--json` - Output response as JSON

**Output:**
- Messages in chronological order
- Sender identification
- Timestamps
- Message content

## Configuration

The CLI stores configuration and session data in:

- **macOS/Linux**: `~/.config/bluesky-cli/`
- **Windows**: `%APPDATA%/bluesky-cli/`

### Files

- `config.json` - Configuration settings
- `session.json` - Authentication session (keep secure!)

### Configuration Options

The `config.json` file supports:

```json
{
  "apiEndpoint": "https://bsky.social",
  "colorOutput": true
}
```

- `apiEndpoint` - Bluesky API endpoint (default: `https://bsky.social`)
- `colorOutput` - Enable colored terminal output (default: `true`)

### Disable Colors

```bash
bsky --no-color timeline
```

## Common Workflows

### Daily Timeline Check

```bash
# Check timeline and notifications
bsky timeline --limit 30
bsky notifications
```

### Post with Media

```bash
# Post photo with description
bsky post "Beautiful sunset!" \
  --image sunset.jpg \
  --alt "Orange and pink sky over the ocean"
```

### Engage in Conversation

```bash
# View a user's posts to find what to reply to
bsky posts @user.bsky.social

# Reply to a specific post
bsky post "Great insight!" --reply-to at://did:plc:.../app.bsky.feed.post/...
```

### Manage DMs

```bash
# Check for new conversations
bsky dm list

# Read and respond
bsky dm read @user.bsky.social
bsky dm send @user.bsky.social "Thanks for reaching out!"
```

### Search and Follow

```bash
# Find users interested in a topic
bsky search "TypeScript"

# Follow interesting accounts
bsky follow @dev.bsky.social
bsky follow @typescript.bsky.social
```

## Scripting and Automation

### Post from Script

```bash
#!/bin/bash
# daily-post.sh
DATE=$(date +"%Y-%m-%d")
bsky post "Daily update for $DATE: All systems operational! ✅"
```

### Monitor Notifications

```bash
#!/bin/bash
# check-notifications.sh
COUNT=$(bsky notifications --json | jq '. | length')
if [ $COUNT -gt 0 ]; then
  echo "You have $COUNT new notifications!"
  bsky notifications
fi
```

### Batch Follow from List

```bash
#!/bin/bash
# follow-list.sh
while read handle; do
  echo "Following $handle..."
  bsky follow "$handle"
  sleep 1  # Be nice to the API
done < users.txt
```

## Contributing

Contributions are welcome! This project is built with TypeScript and Bun.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/bluesky-cli.git
cd bluesky-cli

# Install dependencies
bun install

# Run in development mode
bun run dev

# Build for production
bun run build

# Run linter
bun run lint

# Format code
bun run format
```

### Project Structure

```
bluesky-cli/
├── src/
│   ├── commands/        # Command implementations
│   ├── lib/            # Core libraries (auth, config, output)
│   └── index.ts        # Main entry point
├── dist/               # Built output
└── package.json
```

### Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation for new commands
- Use TypeScript strict mode
- Keep dependencies minimal

## Troubleshooting

### "Not logged in" Error

Run `bsky login` and authenticate with your app password.

### "Invalid AT URI" Error

Ensure you're using the complete AT URI format:
`at://did:plc:abc123.../app.bsky.feed.post/xyz789...`

You can get post URIs from:
- The `--json` output of commands
- The Bluesky web interface (share menu)

### Image Upload Fails

Check that:
- Image is under 1MB in size
- Image format is JPEG, PNG, WebP, or GIF
- File path is correct and accessible

### Rate Limiting

If you encounter rate limits, wait a few minutes before retrying. The Bluesky API has rate limits to prevent abuse.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- [@atproto/api](https://github.com/bluesky-social/atproto) - Official AT Protocol TypeScript library
- [Bluesky](https://bsky.app) - Official Bluesky web client
- [AT Protocol](https://atproto.com) - AT Protocol documentation

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/yourusername/bluesky-cli/issues)
- AT Protocol Community: [atproto.com/community](https://atproto.com/community)

---

Built with ❤️ using [Bun](https://bun.sh) and the [AT Protocol](https://atproto.com)
