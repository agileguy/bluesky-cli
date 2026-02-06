# Bluesky CLI

Command-line interface for Bluesky social network via the AT Protocol.

## Features

- 🔐 **Authentication** - Login with app password, secure credential storage
- 📝 **Posting** - Create posts, reply, quote, attach images
- 📰 **Timeline** - View home feed, notifications, user posts
- 👥 **Social** - Follow/unfollow, search users, view profiles
- 💬 **Direct Messages** - Send and receive DMs

## Installation

```bash
bun install -g bluesky-cli
```

## Quick Start

```bash
# Login
bsky login

# Post
bsky post "Hello Bluesky!"

# View timeline
bsky timeline

# Follow someone
bsky follow @user.bsky.social
```

## Documentation

See [docs/SRD.md](docs/SRD.md) for full specifications.

## License

MIT
