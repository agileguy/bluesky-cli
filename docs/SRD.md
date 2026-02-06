# Bluesky CLI - Software Requirements Document (SRD)

**Version:** 1.0.0
**Date:** 2026-02-06
**Status:** Draft
**Project:** Bluesky Command-Line Interface Tool

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Feature Specifications](#feature-specifications)
4. [API Mappings](#api-mappings)
5. [Implementation Phases](#implementation-phases)
6. [Security Considerations](#security-considerations)
7. [Error Handling Strategy](#error-handling-strategy)
8. [Testing Requirements](#testing-requirements)
9. [Deployment Strategy](#deployment-strategy)

---

## 1. Executive Summary

### 1.1 Project Overview

The Bluesky CLI is a command-line interface tool that enables developers and power users to interact with the Bluesky social network via the AT Protocol API. Built with TypeScript and Bun runtime, this tool provides a fast, efficient, and scriptable interface for all core Bluesky operations.

### 1.2 Business Objectives

- **Developer Experience**: Provide a scriptable CLI for automation and integration
- **Power User Access**: Enable advanced users to manage Bluesky accounts from terminal
- **API Learning Tool**: Serve as reference implementation for AT Protocol integration
- **Cross-Platform Support**: Work seamlessly on macOS, Linux, and Windows

### 1.3 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Installation time | < 30 seconds | Time from `bun install -g` to first command |
| Command response time | < 2 seconds | Average time for non-streaming operations |
| Authentication success rate | > 99% | Successful logins / total attempts |
| User adoption | 1,000+ installs | NPM download count (6 months) |
| API coverage | 100% core features | All essential Bluesky features implemented |

### 1.4 Technology Stack

| Component | Technology | Justification |
|-----------|-----------|---------------|
| Language | TypeScript 5.3+ | Type safety, developer experience |
| Runtime | Bun 1.0+ | Fast startup, native TypeScript, built-in bundling |
| SDK | @atproto/api | Official AT Protocol SDK |
| CLI Framework | commander.js | Mature, well-documented CLI framework |
| Config Storage | ~/.config/bluesky-cli/ | XDG Base Directory compliance |
| Secret Management | keytar (optional) | Secure OS keychain integration |
| Output Formatting | chalk, cli-table3 | Rich terminal output |

### 1.5 Timeline Estimate

- **Phase 1 (Core)**: 2-3 weeks - Authentication, posting, timeline ✅
- **Phase 2 (Social)**: 1-2 weeks - Follow/unfollow, profiles, search ✅
- **Phase 3 (Advanced)**: 2-3 weeks - Direct messages, media handling ✅
- **Phase 4 (Polish)**: 1 week - Error handling, documentation, testing ✅
- **Phase 5 (Release)**: 1 week - Final polish and release preparation ✅
- **Phase 6 (Documentation)**: 1 week - Documentation updates and testing completion ✅
- **Total**: 7-10 weeks (Completed)

### 1.6 Resource Requirements

- **Lead Developer**: 1 senior TypeScript developer (full-time)
- **DevOps Engineer**: 0.25 FTE (CI/CD setup, release automation)
- **Technical Writer**: 0.25 FTE (documentation, examples)
- **QA Engineer**: 0.5 FTE (testing, validation)

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Bluesky CLI                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Command    │  │    Auth      │  │   Config     │    │
│  │   Parser     │──│   Manager    │──│   Manager    │    │
│  │  (commander) │  │              │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           API Client (@atproto/api)                 │  │
│  │  ┌─────────────────────────────────────────────┐   │  │
│  │  │           BskyAgent Instance               │   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
│         │                                                  │
│         ▼                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Output     │  │    Error     │  │   Logger     │    │
│  │  Formatter   │  │   Handler    │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │    Bluesky AT Protocol API    │
         │  (https://bsky.social)        │
         │  (https://api.bsky.chat)      │
         └───────────────────────────────┘
```

### 2.2 Component Descriptions

#### 2.2.1 Command Parser
- **Responsibility**: Parse CLI arguments, route to appropriate handlers
- **Technology**: commander.js
- **Key Features**: Subcommands, flags, help text, validation

#### 2.2.2 Auth Manager
- **Responsibility**: Handle authentication flow, session management, token refresh
- **Technology**: @atproto/api BskyAgent
- **Key Features**: Login, session persistence, auto-refresh, secure storage

#### 2.2.3 Config Manager
- **Responsibility**: Read/write configuration, manage credentials
- **Technology**: Custom module with file I/O
- **Storage**: `~/.config/bluesky-cli/config.json`
- **Key Features**: Profile management, default settings

#### 2.2.4 API Client
- **Responsibility**: Make API calls to Bluesky/AT Protocol
- **Technology**: @atproto/api SDK
- **Key Features**: Request/response handling, rate limiting, retry logic

#### 2.2.5 Output Formatter
- **Responsibility**: Format API responses for terminal display
- **Technology**: chalk, cli-table3
- **Key Features**: Human-readable output, JSON output mode, color coding

#### 2.2.6 Error Handler
- **Responsibility**: Catch and format errors for user display
- **Technology**: Custom error classes
- **Key Features**: User-friendly messages, debug mode, exit codes

### 2.3 Data Flow

#### 2.3.1 Authentication Flow
```
User runs: bsky login
    │
    ▼
Command Parser extracts handle/password
    │
    ▼
Auth Manager calls agent.login()
    │
    ▼
API returns accessJwt + refreshJwt
    │
    ▼
Config Manager stores session
    │
    ▼
Output: "Successfully logged in as @handle"
```

#### 2.3.2 Post Creation Flow
```
User runs: bsky post "Hello world"
    │
    ▼
Command Parser extracts text content
    │
    ▼
Auth Manager validates session (refresh if needed)
    │
    ▼
API Client calls app.bsky.feed.post.create()
    │
    ▼
API returns post record URI
    │
    ▼
Output: "Post created: at://did:plc:xyz/app.bsky.feed.post/abc123"
```

### 2.4 Configuration Architecture

#### 2.4.1 Directory Structure
```
~/.config/bluesky-cli/
├── config.json          # User preferences
├── session.json         # Current session tokens (encrypted)
└── logs/                # Optional debug logs
    └── bluesky-cli.log
```

#### 2.4.2 Configuration Schema

**config.json**:
```json
{
  "version": "1.0.0",
  "defaultHandle": "@user.bsky.social",
  "service": "https://bsky.social",
  "outputFormat": "human",
  "colorEnabled": true,
  "debugMode": false
}
```

**session.json** (encrypted):
```json
{
  "handle": "@user.bsky.social",
  "did": "did:plc:abcdef123456",
  "accessJwt": "eyJ...",
  "refreshJwt": "eyJ...",
  "expiresAt": "2026-02-06T12:00:00Z",
  "service": "https://bsky.social"
}
```

### 2.5 Security Architecture

#### 2.5.1 Credential Storage Options

**Option 1: OS Keychain (Recommended)**
- Use `keytar` library for macOS Keychain, Windows Credential Manager, Linux Secret Service
- Store app password encrypted in OS-native credential storage
- Session tokens stored separately in filesystem (short-lived)

**Option 2: Encrypted File (Fallback)**
- Encrypt `session.json` using machine-specific key (derived from hostname + username)
- AES-256-GCM encryption with PBKDF2 key derivation
- Permissions: 0600 (owner read/write only)

#### 2.5.2 Token Management
- **Access Token**: Short-lived (minutes), used for API requests
- **Refresh Token**: Long-lived (days), used to obtain new access tokens
- **Auto-refresh**: Transparently refresh expired access tokens
- **Expiry Check**: Validate token expiry before each API call

#### 2.5.3 Network Security
- All API calls over HTTPS (TLS 1.3)
- Certificate validation enabled
- No sensitive data in URLs (use POST body for credentials)

---

## 3. Feature Specifications

### 3.1 Authentication Features

#### 3.1.1 Login Command

**Command**: `bsky login [handle]`

**Description**: Authenticate with Bluesky using handle and app password.

**Arguments**:
- `handle` (optional): Bluesky handle (e.g., `user.bsky.social`)

**Flags**:
- `--password <password>`: App password (if not provided, prompt interactively)
- `--service <url>`: PDS service URL (default: `https://bsky.social`)

**Example Usage**:
```bash
# Interactive login (prompts for handle and password)
bsky login

# Login with handle (prompts for password)
bsky login alice.bsky.social

# Non-interactive login
bsky login alice.bsky.social --password hunter2
```

**Acceptance Criteria**:
- ✅ Prompts for handle if not provided
- ✅ Prompts for password securely (hidden input)
- ✅ Validates handle format (must include domain)
- ✅ Calls `com.atproto.server.createSession` API
- ✅ Stores session tokens securely
- ✅ Displays success message with handle
- ✅ Returns exit code 0 on success, 1 on failure
- ✅ Handles invalid credentials gracefully

**Error Scenarios**:
- Invalid handle format → "Error: Invalid handle format. Use: user.bsky.social"
- Invalid credentials → "Error: Invalid username or password"
- Network error → "Error: Unable to connect to Bluesky. Check your internet connection."

---

#### 3.1.2 Logout Command

**Command**: `bsky logout`

**Description**: Remove stored session and log out.

**Flags**:
- `--all`: Remove all stored sessions (if multiple profile support)

**Example Usage**:
```bash
bsky logout
```

**Acceptance Criteria**:
- ✅ Deletes session.json file
- ✅ Clears credentials from OS keychain (if used)
- ✅ Displays confirmation message
- ✅ Returns exit code 0

---

#### 3.1.3 Whoami Command

**Command**: `bsky whoami`

**Description**: Display currently logged-in user information.

**Flags**:
- `--json`: Output in JSON format

**Example Usage**:
```bash
bsky whoami
# Output: Logged in as @alice.bsky.social (did:plc:abc123)

bsky whoami --json
# Output: {"handle":"alice.bsky.social","did":"did:plc:abc123"}
```

**Acceptance Criteria**:
- ✅ Reads current session
- ✅ Displays handle and DID
- ✅ Supports JSON output mode
- ✅ Returns exit code 0 if logged in, 1 if not

---

### 3.2 Posting Features

#### 3.2.1 Create Post Command

**Command**: `bsky post <text>`

**Description**: Create a text post on Bluesky.

**Arguments**:
- `text`: Post content (up to 300 characters)

**Flags**:
- `--image <path>`: Attach image (can be repeated up to 4 times)
- `--alt <text>`: Alt text for image (must follow --image flag)
- `--reply-to <uri>`: Reply to specific post URI
- `--quote <uri>`: Quote another post
- `--json`: Output post URI in JSON format

**Example Usage**:
```bash
# Simple text post
bsky post "Hello Bluesky!"

# Post with image
bsky post "Check this out" --image ./photo.jpg --alt "A beautiful sunset"

# Post with multiple images
bsky post "Photo album" --image img1.jpg --alt "First" --image img2.jpg --alt "Second"

# Reply to post
bsky post "Great point!" --reply-to at://did:plc:abc/app.bsky.feed.post/xyz

# Quote post
bsky post "Interesting take" --quote at://did:plc:abc/app.bsky.feed.post/xyz

# Read from stdin
echo "Automated post" | bsky post
```

**Acceptance Criteria**:
- ✅ Validates text length (max 300 chars)
- ✅ Supports reading from stdin if no text argument
- ✅ Uploads images to blob storage
- ✅ Attaches image refs to post record
- ✅ Creates reply reference if --reply-to used
- ✅ Creates embed if --quote used
- ✅ Calls `app.bsky.feed.post` record creation
- ✅ Displays post URI on success
- ✅ Returns exit code 0 on success

**Error Scenarios**:
- Text too long → "Error: Post exceeds 300 character limit (350/300)"
- Image not found → "Error: Image file not found: ./photo.jpg"
- Invalid image format → "Error: Unsupported image format. Use JPEG, PNG, or WebP"
- Image too large → "Error: Image exceeds 1MB limit"
- Invalid reply/quote URI → "Error: Invalid post URI format"

---

#### 3.2.2 Delete Post Command

**Command**: `bsky delete <uri>`

**Description**: Delete a post by URI.

**Arguments**:
- `uri`: Post URI (at://...)

**Flags**:
- `--force`: Skip confirmation prompt

**Example Usage**:
```bash
bsky delete at://did:plc:abc/app.bsky.feed.post/xyz
# Prompt: Are you sure you want to delete this post? (y/N)

bsky delete at://did:plc:abc/app.bsky.feed.post/xyz --force
```

**Acceptance Criteria**:
- ✅ Prompts for confirmation (unless --force)
- ✅ Validates URI format
- ✅ Deletes record from repository
- ✅ Displays success message
- ✅ Returns exit code 0 on success

---

### 3.3 Timeline Features

#### 3.3.1 View Timeline Command

**Command**: `bsky timeline`

**Description**: Display home timeline (following feed).

**Flags**:
- `--limit <n>`: Number of posts to fetch (default: 20, max: 100)
- `--cursor <cursor>`: Pagination cursor for next page
- `--json`: Output in JSON format

**Example Usage**:
```bash
# View recent posts
bsky timeline

# Fetch more posts
bsky timeline --limit 50

# Pagination
bsky timeline --cursor dHJ1ZQ==
```

**Output Format** (human-readable):
```
┌────────────────────────────────────────────────────────────┐
│ @alice.bsky.social · 2 hours ago                           │
├────────────────────────────────────────────────────────────┤
│ Just discovered this amazing CLI tool! 🚀                  │
│                                                            │
│ 👍 5   💬 2   🔁 1                                         │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ @bob.bsky.social · 5 hours ago                             │
├────────────────────────────────────────────────────────────┤
│ Working on some TypeScript today. Anyone have good         │
│ resources for advanced types?                              │
│                                                            │
│ 👍 12   💬 8   🔁 3                                        │
└────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- ✅ Calls `app.bsky.feed.getTimeline` API
- ✅ Displays posts in reverse chronological order
- ✅ Shows author handle, timestamp, content
- ✅ Shows engagement metrics (likes, replies, reposts)
- ✅ Supports pagination with cursor
- ✅ Truncates long posts with "..." indicator
- ✅ Returns exit code 0

---

#### 3.3.2 View User Posts Command

**Command**: `bsky posts <handle>`

**Description**: Display posts from a specific user.

**Arguments**:
- `handle`: User handle (e.g., `alice.bsky.social`)

**Flags**:
- `--limit <n>`: Number of posts to fetch (default: 20)
- `--cursor <cursor>`: Pagination cursor
- `--json`: Output in JSON format

**Example Usage**:
```bash
bsky posts alice.bsky.social
bsky posts alice.bsky.social --limit 50
```

**Acceptance Criteria**:
- ✅ Resolves handle to DID
- ✅ Calls `app.bsky.feed.getAuthorFeed` API
- ✅ Displays posts in same format as timeline
- ✅ Supports pagination
- ✅ Returns exit code 0

---

#### 3.3.3 View Notifications Command

**Command**: `bsky notifications`

**Description**: Display notifications (likes, replies, follows, mentions).

**Flags**:
- `--limit <n>`: Number of notifications to fetch (default: 20)
- `--unread`: Show only unread notifications
- `--json`: Output in JSON format

**Example Usage**:
```bash
bsky notifications
bsky notifications --unread
```

**Output Format**:
```
📬 Notifications

👤 @carol.bsky.social followed you · 1 hour ago
❤️  @dave.bsky.social liked your post · 2 hours ago
    "Just discovered this amazing CLI tool! 🚀"
💬 @eve.bsky.social replied to your post · 3 hours ago
    "Where can I download this?"
```

**Acceptance Criteria**:
- ✅ Calls `app.bsky.notification.listNotifications` API
- ✅ Groups notifications by type
- ✅ Shows relevant context (post excerpt for likes/replies)
- ✅ Indicates unread status
- ✅ Marks notifications as read after viewing (unless --json)
- ✅ Returns exit code 0

---

### 3.4 Social Features

#### 3.4.1 Follow User Command

**Command**: `bsky follow <handle>`

**Description**: Follow a user by handle.

**Arguments**:
- `handle`: User handle to follow

**Example Usage**:
```bash
bsky follow alice.bsky.social
# Output: Now following @alice.bsky.social
```

**Acceptance Criteria**:
- ✅ Resolves handle to DID
- ✅ Creates follow record in repository
- ✅ Displays confirmation message
- ✅ Returns exit code 0 on success
- ✅ Handles already-following gracefully

---

#### 3.4.2 Unfollow User Command

**Command**: `bsky unfollow <handle>`

**Description**: Unfollow a user by handle.

**Arguments**:
- `handle`: User handle to unfollow

**Flags**:
- `--force`: Skip confirmation prompt

**Example Usage**:
```bash
bsky unfollow alice.bsky.social
# Prompt: Are you sure you want to unfollow @alice.bsky.social? (y/N)
```

**Acceptance Criteria**:
- ✅ Resolves handle to DID
- ✅ Finds follow record URI
- ✅ Deletes follow record
- ✅ Prompts for confirmation (unless --force)
- ✅ Displays confirmation message
- ✅ Returns exit code 0 on success

---

#### 3.4.3 List Followers Command

**Command**: `bsky followers [handle]`

**Description**: List users who follow you (or another user).

**Arguments**:
- `handle` (optional): User handle (defaults to current user)

**Flags**:
- `--limit <n>`: Number to fetch (default: 50)
- `--cursor <cursor>`: Pagination cursor
- `--json`: Output in JSON format

**Example Usage**:
```bash
bsky followers
bsky followers alice.bsky.social --limit 100
```

**Output Format**:
```
Followers of @alice.bsky.social (1,234 total)

@bob.bsky.social
  Software engineer | TypeScript enthusiast

@carol.bsky.social
  Designer | Making things beautiful

@dave.bsky.social
  Writer | Science fiction fan
```

**Acceptance Criteria**:
- ✅ Calls `app.bsky.graph.getFollowers` API
- ✅ Shows follower count
- ✅ Displays handle and bio for each follower
- ✅ Supports pagination
- ✅ Returns exit code 0

---

#### 3.4.4 List Following Command

**Command**: `bsky following [handle]`

**Description**: List users you follow (or another user follows).

**Arguments**:
- `handle` (optional): User handle (defaults to current user)

**Flags**:
- `--limit <n>`: Number to fetch (default: 50)
- `--cursor <cursor>`: Pagination cursor
- `--json`: Output in JSON format

**Example Usage**:
```bash
bsky following
bsky following alice.bsky.social
```

**Acceptance Criteria**:
- ✅ Calls `app.bsky.graph.getFollows` API
- ✅ Shows following count
- ✅ Displays handle and bio for each user
- ✅ Supports pagination
- ✅ Returns exit code 0

---

#### 3.4.5 View Profile Command

**Command**: `bsky profile <handle>`

**Description**: Display detailed profile information for a user.

**Arguments**:
- `handle`: User handle

**Flags**:
- `--json`: Output in JSON format

**Example Usage**:
```bash
bsky profile alice.bsky.social
```

**Output Format**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @alice.bsky.social
  Alice Johnson

  Software engineer | TypeScript enthusiast | Building cool CLI tools

  📍 San Francisco, CA
  🔗 https://alice.dev

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Posts: 1,234      Following: 567      Followers: 890

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Acceptance Criteria**:
- ✅ Calls `app.bsky.actor.getProfile` API
- ✅ Displays handle, display name, bio
- ✅ Shows follower/following counts, post count
- ✅ Shows avatar (as URL in JSON mode)
- ✅ Returns exit code 0

---

#### 3.4.6 Search Users Command

**Command**: `bsky search <query>`

**Description**: Search for users by handle or display name.

**Arguments**:
- `query`: Search query

**Flags**:
- `--limit <n>`: Number of results (default: 20)
- `--json`: Output in JSON format

**Example Usage**:
```bash
bsky search "alice"
bsky search "software engineer" --limit 50
```

**Output Format**:
```
Search results for "alice"

@alice.bsky.social (Alice Johnson)
  Software engineer | TypeScript enthusiast

@alice-dev.bsky.social (Alice Dev)
  Developer advocate | Building in public

@alice123.bsky.social (Alice)
  Just here to post cat photos 🐱
```

**Acceptance Criteria**:
- ✅ Calls `app.bsky.actor.searchActors` API
- ✅ Displays matching users with handle and bio
- ✅ Supports result limiting
- ✅ Returns exit code 0

---

### 3.5 Direct Message Features

#### 3.5.1 List Conversations Command

**Command**: `bsky dm list`

**Description**: List all DM conversations.

**Flags**:
- `--limit <n>`: Number of conversations (default: 50)
- `--json`: Output in JSON format

**Example Usage**:
```bash
bsky dm list
```

**Output Format**:
```
💬 Conversations

┌────────────────────────────────────────────────────────────┐
│ @bob.bsky.social · 10 minutes ago                          │
├────────────────────────────────────────────────────────────┤
│ Bob: Thanks for the help!                                  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ @carol.bsky.social · 2 hours ago                           │
├────────────────────────────────────────────────────────────┤
│ Carol: Want to collaborate on a project?                   │
└────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- ✅ Calls `chat.bsky.convo.listConvos` API
- ✅ Shows conversation partner, timestamp, last message preview
- ✅ Sorts by most recent activity
- ✅ Indicates unread messages
- ✅ Returns exit code 0

**Notes**:
- DM access requires special app password scope (`chat.bsky.convo.*`)
- Requests proxied to `did:web:api.bsky.chat` service

---

#### 3.5.2 Send DM Command

**Command**: `bsky dm send <handle> <message>`

**Description**: Send a direct message to a user.

**Arguments**:
- `handle`: Recipient handle
- `message`: Message text

**Flags**:
- `--json`: Output in JSON format

**Example Usage**:
```bash
bsky dm send bob.bsky.social "Hey Bob, how's it going?"

# Read message from stdin
echo "Long message..." | bsky dm send bob.bsky.social
```

**Acceptance Criteria**:
- ✅ Resolves handle to DID
- ✅ Gets or creates conversation ID
- ✅ Calls `chat.bsky.convo.sendMessage` API
- ✅ Displays confirmation message
- ✅ Returns exit code 0 on success
- ✅ Supports reading message from stdin

**Error Scenarios**:
- User doesn't accept DMs → "Error: User has disabled direct messages"
- Blocked by user → "Error: Unable to send message. You may be blocked."
- Rate limit → "Error: Too many messages sent. Try again in a few minutes."

---

#### 3.5.3 Read DMs Command

**Command**: `bsky dm read <handle>`

**Description**: Read DM conversation with a specific user.

**Arguments**:
- `handle`: Conversation partner handle

**Flags**:
- `--limit <n>`: Number of messages to fetch (default: 50)
- `--json`: Output in JSON format

**Example Usage**:
```bash
bsky dm read bob.bsky.social
```

**Output Format**:
```
💬 Conversation with @bob.bsky.social

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[10:30 AM] Bob:
Hey! Thanks for the CLI tool recommendation.

[10:32 AM] You:
No problem! Let me know if you need any help setting it up.

[10:35 AM] Bob:
Actually, I'm getting an error during installation...

[10:36 AM] You:
What's the error message?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Acceptance Criteria**:
- ✅ Resolves handle to DID
- ✅ Gets conversation ID
- ✅ Calls `chat.bsky.convo.getMessages` API
- ✅ Displays messages in chronological order
- ✅ Shows timestamp for each message
- ✅ Distinguishes sent vs received messages
- ✅ Marks messages as read
- ✅ Returns exit code 0

---

## 4. API Mappings

### 4.1 Authentication Endpoints

| CLI Command | AT Protocol Endpoint | HTTP Method | Parameters |
|-------------|---------------------|-------------|------------|
| `bsky login` | `com.atproto.server.createSession` | POST | `identifier`, `password` |
| `bsky logout` | `com.atproto.server.deleteSession` | POST | (authenticated) |
| Token refresh | `com.atproto.server.refreshSession` | POST | `refreshJwt` |
| `bsky whoami` | `com.atproto.server.getSession` | GET | (authenticated) |

### 4.2 Repository (Posting) Endpoints

| CLI Command | AT Protocol Endpoint | HTTP Method | Parameters |
|-------------|---------------------|-------------|------------|
| `bsky post` | `com.atproto.repo.createRecord` | POST | `repo`, `collection`, `record` |
| `bsky delete` | `com.atproto.repo.deleteRecord` | POST | `repo`, `collection`, `rkey` |
| Image upload | `com.atproto.repo.uploadBlob` | POST | binary image data |

**Collection Names**:
- Posts: `app.bsky.feed.post`
- Follows: `app.bsky.graph.follow`
- Likes: `app.bsky.feed.like`
- Reposts: `app.bsky.feed.repost`

### 4.3 Feed Endpoints

| CLI Command | AT Protocol Endpoint | HTTP Method | Parameters |
|-------------|---------------------|-------------|------------|
| `bsky timeline` | `app.bsky.feed.getTimeline` | GET | `limit`, `cursor` |
| `bsky posts <handle>` | `app.bsky.feed.getAuthorFeed` | GET | `actor`, `limit`, `cursor` |
| `bsky notifications` | `app.bsky.notification.listNotifications` | GET | `limit`, `cursor` |
| Mark notifications read | `app.bsky.notification.updateSeen` | POST | `seenAt` |

### 4.4 Social Graph Endpoints

| CLI Command | AT Protocol Endpoint | HTTP Method | Parameters |
|-------------|---------------------|-------------|------------|
| `bsky follow` | `com.atproto.repo.createRecord` | POST | collection: `app.bsky.graph.follow` |
| `bsky unfollow` | `com.atproto.repo.deleteRecord` | POST | collection: `app.bsky.graph.follow` |
| `bsky followers` | `app.bsky.graph.getFollowers` | GET | `actor`, `limit`, `cursor` |
| `bsky following` | `app.bsky.graph.getFollows` | GET | `actor`, `limit`, `cursor` |
| `bsky profile` | `app.bsky.actor.getProfile` | GET | `actor` |
| `bsky search` | `app.bsky.actor.searchActors` | GET | `term`, `limit` |

### 4.5 Chat (DM) Endpoints

| CLI Command | AT Protocol Endpoint | HTTP Method | Parameters |
|-------------|---------------------|-------------|------------|
| `bsky dm list` | `chat.bsky.convo.listConvos` | GET | `limit`, `cursor` |
| `bsky dm send` | `chat.bsky.convo.sendMessage` | POST | `convoId`, `message` |
| `bsky dm read` | `chat.bsky.convo.getMessages` | GET | `convoId`, `limit`, `cursor` |
| Get conversation | `chat.bsky.convo.getConvoForMembers` | GET | `members` |

**Note**: Chat API requests must include `atproto-proxy` header with value `did:web:api.bsky.chat`.

### 4.6 Resolution Endpoints

| Purpose | AT Protocol Endpoint | HTTP Method | Parameters |
|---------|---------------------|-------------|------------|
| Resolve handle to DID | `com.atproto.identity.resolveHandle` | GET | `handle` |
| Get DID document | `com.atproto.identity.resolveHandle` | GET | `handle` |

---

## 5. Implementation Phases

### Phase 1: Core Foundation (Week 1-2)

#### 5.1.1 Project Setup Checklist
- [ ] Initialize Bun project with TypeScript
- [ ] Install dependencies: @atproto/api, commander, chalk, cli-table3
- [ ] Configure TypeScript (strict mode, ES2022 target)
- [ ] Set up project structure (src/, tests/, docs/)
- [ ] Configure ESLint and Prettier
- [ ] Create basic CLI entry point (index.ts)
- [ ] Set up build script and output to dist/
- [ ] Configure package.json bin entry
- [ ] Create README.md with installation instructions

#### 5.1.2 Configuration System Checklist
- [ ] Create ConfigManager class
- [ ] Implement config directory creation (~/.config/bluesky-cli/)
- [ ] Implement config.json read/write
- [ ] Implement session.json read/write
- [ ] Add encryption for session.json (AES-256-GCM)
- [ ] Implement file permissions check (0600)
- [ ] Add config validation schema
- [ ] Create default config template
- [ ] Add error handling for filesystem operations

#### 5.1.3 Authentication System Checklist
- [ ] Create AuthManager class
- [ ] Implement BskyAgent initialization
- [ ] Implement login flow (createSession)
- [ ] Implement session persistence
- [ ] Implement token refresh logic
- [ ] Implement logout flow (deleteSession)
- [ ] Implement session validation
- [ ] Add auto-refresh on expired access token
- [ ] Create authentication middleware for commands
- [ ] Add error handling for auth failures

#### 5.1.4 Authentication Commands Checklist
- [ ] Implement `bsky login` command
- [ ] Add interactive prompts for handle/password
- [ ] Add --password flag for non-interactive mode
- [ ] Add --service flag for custom PDS
- [ ] Implement `bsky logout` command
- [ ] Implement `bsky whoami` command
- [ ] Add --json flag support for whoami
- [ ] Write unit tests for auth commands
- [ ] Write integration tests for auth flow

---

### Phase 2: Posting & Timeline (Week 2-3)

#### 5.2.1 Output Formatting Checklist
- [ ] Create OutputFormatter class
- [ ] Implement human-readable post formatter
- [ ] Implement JSON output formatter
- [ ] Create styled terminal boxes for posts
- [ ] Add timestamp formatting (relative times)
- [ ] Add engagement metrics display
- [ ] Implement text wrapping for long posts
- [ ] Add color coding (handles, timestamps, etc.)
- [ ] Create table formatter for lists

#### 5.2.2 Post Creation Checklist
- [ ] Implement `bsky post` command
- [ ] Add text length validation (300 chars)
- [ ] Add stdin reading support
- [ ] Implement image upload (uploadBlob)
- [ ] Add --image flag with path validation
- [ ] Add --alt flag for alt text
- [ ] Implement multiple image support (up to 4)
- [ ] Add image format validation (JPEG, PNG, WebP)
- [ ] Add image size validation (max 1MB)
- [ ] Implement --reply-to flag
- [ ] Implement --quote flag
- [ ] Add facet detection (mentions, links)
- [ ] Write unit tests for post creation
- [ ] Write integration tests with image upload

#### 5.2.3 Post Deletion Checklist
- [ ] Implement `bsky delete` command
- [ ] Add URI validation
- [ ] Add confirmation prompt
- [ ] Add --force flag to skip confirmation
- [ ] Implement record deletion
- [ ] Add error handling for not-found posts
- [ ] Write unit tests for deletion

#### 5.2.4 Timeline Commands Checklist
- [ ] Implement `bsky timeline` command
- [ ] Add --limit flag (default 20, max 100)
- [ ] Add --cursor flag for pagination
- [ ] Implement post rendering
- [ ] Add engagement metrics display
- [ ] Implement `bsky posts <handle>` command
- [ ] Add handle-to-DID resolution
- [ ] Implement `bsky notifications` command
- [ ] Add notification type indicators (follow, like, reply, mention)
- [ ] Add --unread flag for notifications
- [ ] Implement mark-as-read on view
- [ ] Write unit tests for timeline commands
- [ ] Write integration tests for pagination

---

### Phase 3: Social Features (Week 3-4)

#### 5.3.1 Follow Management Checklist
- [ ] Implement `bsky follow` command
- [ ] Add handle-to-DID resolution
- [ ] Create follow record in repository
- [ ] Add duplicate follow detection
- [ ] Implement `bsky unfollow` command
- [ ] Add follow record lookup
- [ ] Add confirmation prompt
- [ ] Add --force flag
- [ ] Write unit tests for follow/unfollow
- [ ] Write integration tests

#### 5.3.2 Social Browsing Checklist
- [ ] Implement `bsky followers` command
- [ ] Add --limit flag
- [ ] Add --cursor flag for pagination
- [ ] Format follower list with bio
- [ ] Implement `bsky following` command
- [ ] Add --limit flag
- [ ] Add --cursor flag for pagination
- [ ] Format following list with bio
- [ ] Write unit tests
- [ ] Write integration tests

#### 5.3.3 Profile & Search Checklist
- [ ] Implement `bsky profile` command
- [ ] Create detailed profile formatter
- [ ] Display profile stats (posts, followers, following)
- [ ] Display bio, location, website
- [ ] Implement `bsky search` command
- [ ] Add --limit flag
- [ ] Format search results
- [ ] Write unit tests
- [ ] Write integration tests

---

### Phase 4: Direct Messages (Week 4-5)

#### 5.4.1 DM Infrastructure Checklist
- [ ] Create ChatClient wrapper for DM API
- [ ] Implement service proxy header injection
- [ ] Add DM-specific error handling
- [ ] Create conversation cache
- [ ] Implement conversation ID lookup
- [ ] Add rate limiting for DM endpoints

#### 5.4.2 DM Commands Checklist
- [ ] Implement `bsky dm list` command
- [ ] Format conversation list
- [ ] Add unread indicators
- [ ] Show last message preview
- [ ] Implement `bsky dm send` command
- [ ] Add handle-to-DID resolution
- [ ] Implement conversation creation
- [ ] Add message sending
- [ ] Add stdin support for messages
- [ ] Implement `bsky dm read` command
- [ ] Format message history
- [ ] Add sender/receiver indicators
- [ ] Implement mark-as-read
- [ ] Write unit tests
- [ ] Write integration tests

---

### Phase 5: Polish & Release (Week 5-6)

#### 5.5.1 Error Handling Checklist
- [ ] Create custom error classes
- [ ] Implement user-friendly error messages
- [ ] Add debug mode with full stack traces
- [ ] Implement retry logic for network errors
- [ ] Add rate limit detection and backoff
- [ ] Create error code mapping
- [ ] Add error logging
- [ ] Test all error scenarios

#### 5.5.2 Performance Optimization Checklist
- [ ] Implement response caching
- [ ] Add connection pooling
- [ ] Optimize bundle size
- [ ] Implement lazy loading for heavy modules
- [ ] Add progress indicators for slow operations
- [ ] Optimize image upload compression

#### 5.5.3 Testing Checklist
- [ ] Write unit tests for all modules (>80% coverage)
- [ ] Write integration tests for command flows
- [ ] Create mock AT Protocol server for testing
- [ ] Test error scenarios
- [ ] Test rate limiting behavior
- [ ] Test authentication flows
- [ ] Test pagination logic
- [ ] Perform manual end-to-end testing

#### 5.5.4 Documentation Checklist
- [ ] Write comprehensive README.md
- [ ] Create CONTRIBUTING.md
- [ ] Write API documentation
- [ ] Create usage examples
- [ ] Document configuration options
- [ ] Document error codes
- [ ] Create troubleshooting guide
- [ ] Write security best practices doc

#### 5.5.5 Release Preparation Checklist
- [ ] Set up GitHub repository
- [ ] Configure GitHub Actions CI/CD
- [ ] Set up automated testing
- [ ] Configure automated releases
- [ ] Create release notes template
- [ ] Set up npm publishing
- [ ] Create installation script
- [ ] Test installation on multiple platforms
- [ ] Create demo video/GIF
- [ ] Announce release

---

### Phase 6: Documentation & Testing Completion (Week 6-7)

#### 5.6.1 Documentation Updates Checklist
- [x] Update package.json metadata (author, repository URLs)
- [x] Update README.md with correct repository information
- [x] Add test command to documentation
- [x] Update GitHub repository description
- [x] Verify all documentation links are correct
- [x] Complete SRD with Phase 6 implementation checklist

#### 5.6.2 Testing Infrastructure Checklist
- [x] Verify test script in package.json
- [x] Ensure test files are properly structured
- [x] Document testing procedures in README
- [x] All phases completed and verified

**Status**: ✅ Complete - All implementation phases finished

---

## 6. Security Considerations

### 6.1 Credential Management

#### 6.1.1 App Password Security
**Risk**: App passwords stored in plaintext could be compromised.

**Mitigation**:
- Use OS keychain (keytar library) for password storage
- Encrypt session.json with machine-specific key
- Set file permissions to 0600 (owner read/write only)
- Never log credentials
- Clear credentials from memory after use

#### 6.1.2 Session Token Security
**Risk**: Session tokens could be stolen and used to impersonate user.

**Mitigation**:
- Store tokens in encrypted session.json
- Set restrictive file permissions (0600)
- Implement automatic token expiry
- Refresh tokens regularly
- Clear tokens on logout
- Never transmit tokens over insecure channels

#### 6.1.3 App Password Scope
**Risk**: Granting excessive permissions to CLI tool.

**Mitigation**:
- Document required scopes clearly
- Only request DM scope if using `bsky dm` commands
- Recommend separate app passwords for different tools
- Implement scope validation

### 6.2 Network Security

#### 6.2.1 TLS/HTTPS
**Risk**: Man-in-the-middle attacks intercepting credentials.

**Mitigation**:
- Enforce HTTPS for all API calls
- Validate TLS certificates
- Use TLS 1.3 where available
- Reject self-signed certificates (except with explicit flag)

#### 6.2.2 Rate Limiting
**Risk**: Abusive API usage or accidental DoS.

**Mitigation**:
- Implement client-side rate limiting
- Add exponential backoff on rate limit errors
- Display helpful messages when rate limited
- Cache responses where appropriate

### 6.3 Input Validation

#### 6.3.1 Command Injection
**Risk**: Malicious input could execute arbitrary commands.

**Mitigation**:
- Validate all user inputs
- Sanitize file paths
- Use parameterized API calls
- Never use `eval()` or `exec()` on user input

#### 6.3.2 Path Traversal
**Risk**: Malicious file paths could access unauthorized files.

**Mitigation**:
- Validate image file paths
- Resolve paths to absolute paths
- Check file extensions
- Limit file access to user-specified directories

### 6.4 API Security

#### 6.4.1 DID Resolution
**Risk**: Malicious DID documents could redirect API calls.

**Mitigation**:
- Validate DID document structure
- Use trusted resolution services
- Cache DID documents with TTL
- Verify DID signatures where applicable

#### 6.4.2 Post Content
**Risk**: Malicious content in posts (XSS, phishing links).

**Mitigation**:
- Display raw text (no HTML rendering in CLI)
- Warn users about suspicious links (optional feature)
- Validate URIs before making API calls

### 6.5 Privacy Considerations

#### 6.5.1 Local Data Storage
**Risk**: Sensitive data stored locally could be accessed.

**Mitigation**:
- Store minimal data locally
- Encrypt sensitive files
- Use OS keychain for credentials
- Implement secure delete for logout
- Document data storage locations

#### 6.5.2 Logging
**Risk**: Logs could contain sensitive information.

**Mitigation**:
- Never log credentials or tokens
- Redact sensitive data in debug output
- Store logs with restrictive permissions
- Implement log rotation
- Document log locations

### 6.6 Dependency Security

#### 6.6.1 Supply Chain Attacks
**Risk**: Compromised dependencies could introduce vulnerabilities.

**Mitigation**:
- Use lock files (bun.lockb)
- Audit dependencies regularly (`bun audit`)
- Pin dependency versions
- Review dependency changes in updates
- Use trusted, well-maintained packages

#### 6.6.2 Vulnerability Management
**Risk**: Known vulnerabilities in dependencies.

**Mitigation**:
- Run `bun audit` in CI/CD
- Subscribe to security advisories
- Update dependencies promptly
- Implement automated security scanning

---

## 7. Error Handling Strategy

### 7.1 Error Categories

#### 7.1.1 Authentication Errors
| Error Code | Description | User Message | Exit Code |
|------------|-------------|--------------|-----------|
| AUTH_INVALID_CREDENTIALS | Wrong username/password | "Invalid username or password" | 1 |
| AUTH_EXPIRED_TOKEN | Access token expired | "Session expired. Logging in again..." (auto-recover) | 0 |
| AUTH_NO_SESSION | Not logged in | "Not logged in. Run: bsky login" | 1 |
| AUTH_INVALID_TOKEN | Malformed token | "Authentication error. Please log in again." | 1 |

#### 7.1.2 Network Errors
| Error Code | Description | User Message | Exit Code |
|------------|-------------|--------------|-----------|
| NET_TIMEOUT | Request timeout | "Request timed out. Check your internet connection." | 1 |
| NET_CONNECTION_REFUSED | Cannot connect to server | "Cannot connect to Bluesky. Try again later." | 1 |
| NET_DNS_FAILURE | DNS resolution failed | "Cannot resolve hostname. Check your DNS settings." | 1 |
| NET_OFFLINE | No internet connection | "No internet connection detected." | 1 |

#### 7.1.3 API Errors
| Error Code | Description | User Message | Exit Code |
|------------|-------------|--------------|-----------|
| API_RATE_LIMIT | Too many requests | "Rate limited. Try again in X minutes." | 1 |
| API_NOT_FOUND | Resource not found | "Post/User not found." | 1 |
| API_FORBIDDEN | Insufficient permissions | "Permission denied. Check app password scope." | 1 |
| API_BAD_REQUEST | Invalid request | "Invalid request: [reason]" | 1 |
| API_SERVER_ERROR | Server error (5xx) | "Bluesky server error. Try again later." | 1 |

#### 7.1.4 Validation Errors
| Error Code | Description | User Message | Exit Code |
|------------|-------------|--------------|-----------|
| VAL_TEXT_TOO_LONG | Post exceeds limit | "Post exceeds 300 character limit (X/300)" | 1 |
| VAL_INVALID_HANDLE | Invalid handle format | "Invalid handle. Use: user.bsky.social" | 1 |
| VAL_INVALID_URI | Invalid AT URI | "Invalid post URI. Use: at://..." | 1 |
| VAL_FILE_NOT_FOUND | Image file not found | "File not found: [path]" | 1 |
| VAL_INVALID_IMAGE | Invalid image format | "Unsupported image format. Use JPEG/PNG/WebP." | 1 |
| VAL_IMAGE_TOO_LARGE | Image exceeds size limit | "Image exceeds 1MB limit." | 1 |

#### 7.1.5 File System Errors
| Error Code | Description | User Message | Exit Code |
|------------|-------------|--------------|-----------|
| FS_PERMISSION_DENIED | Cannot read/write file | "Permission denied: [path]" | 1 |
| FS_NO_SPACE | Disk full | "Insufficient disk space." | 1 |
| FS_INVALID_PATH | Invalid file path | "Invalid file path: [path]" | 1 |

### 7.2 Error Handling Patterns

#### 7.2.1 Retry Strategy
```typescript
interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
  retryableErrors: string[];
}

// Retry network errors with exponential backoff
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  backoffMs: 1000, // 1s, 2s, 4s
  retryableErrors: ['NET_TIMEOUT', 'NET_CONNECTION_REFUSED', 'API_SERVER_ERROR']
};
```

#### 7.2.2 Auto-Recovery
- **Expired Access Token**: Automatically refresh and retry
- **Rate Limit**: Display remaining time, suggest --wait flag
- **Network Blip**: Retry with exponential backoff

#### 7.2.3 User-Friendly Messages
- **Avoid technical jargon**: "Session expired" not "JWT validation failed"
- **Provide actionable steps**: "Run: bsky login" not "Not authenticated"
- **Show context**: "Post exceeds 300 character limit (350/300)"

#### 7.2.4 Debug Mode
Enable with `--debug` or `DEBUG=1` environment variable:
- Show full stack traces
- Log API requests/responses
- Display timing information
- Show retry attempts

### 7.3 Error Response Format

#### 7.3.1 Human-Readable (Default)
```
Error: Invalid username or password

Try:
  • Check your handle (use: user.bsky.social)
  • Check your app password (not your regular password)
  • Create an app password at: https://bsky.app/settings/app-passwords
```

#### 7.3.2 JSON Format (--json)
```json
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid username or password",
    "details": {
      "handle": "user.bsky.social"
    },
    "timestamp": "2026-02-06T12:00:00Z"
  }
}
```

---

## 8. Testing Requirements

### 8.1 Unit Testing

#### 8.1.1 Test Coverage Requirements
- **Minimum Coverage**: 80% overall
- **Critical Paths**: 100% (auth, posting, API calls)
- **Test Framework**: Bun's built-in test runner
- **Assertion Library**: Bun's built-in assertions

#### 8.1.2 Unit Test Checklist
- [ ] ConfigManager tests (read/write/encryption)
- [ ] AuthManager tests (login/logout/refresh)
- [ ] OutputFormatter tests (all output modes)
- [ ] Validation tests (handles, URIs, text length)
- [ ] Error handler tests (all error types)
- [ ] Command parser tests (all flags/arguments)
- [ ] API client wrapper tests (mocked responses)

### 8.2 Integration Testing

#### 8.2.1 Integration Test Scenarios
- [ ] Full login flow (create session, store tokens)
- [ ] Post creation with image upload
- [ ] Timeline fetching and pagination
- [ ] Follow/unfollow flow
- [ ] DM send/receive flow
- [ ] Token refresh on expiry
- [ ] Rate limit handling
- [ ] Error recovery scenarios

#### 8.2.2 Test Environment
- Use test account on Bluesky (not production)
- Mock AT Protocol server for controlled testing
- Separate test configuration directory

### 8.3 End-to-End Testing

#### 8.3.1 E2E Test Scenarios
- [ ] Fresh install and first login
- [ ] Create post, verify on Bluesky web
- [ ] Follow user, verify in follower list
- [ ] Send DM, verify in recipient's inbox
- [ ] Logout and re-login
- [ ] Session expiry and auto-refresh
- [ ] Network error and retry

### 8.4 Performance Testing

#### 8.4.1 Performance Benchmarks
| Operation | Target Time | Measurement |
|-----------|-------------|-------------|
| CLI startup | < 100ms | Time to parse commands |
| Login | < 2s | Time to complete auth |
| Create post | < 1s | Time to post (text only) |
| Create post with image | < 5s | Time to upload + post |
| Fetch timeline | < 2s | Time to fetch + render 20 posts |
| Search users | < 2s | Time to search + render results |

#### 8.4.2 Load Testing
- Test with large timelines (100+ posts)
- Test with many followers (1000+)
- Test pagination performance
- Test image upload with max size (1MB)

### 8.5 Security Testing

#### 8.5.1 Security Test Checklist
- [ ] Verify encrypted storage (session.json)
- [ ] Verify file permissions (0600)
- [ ] Test credential redaction in logs
- [ ] Test path traversal prevention
- [ ] Test input sanitization
- [ ] Test dependency vulnerabilities (`bun audit`)
- [ ] Test TLS certificate validation

---

## 9. Deployment Strategy

### 9.1 Distribution Channels

#### 9.1.1 NPM Package
- **Package Name**: `@bluesky/cli` (or `bluesky-cli`)
- **Registry**: npmjs.com
- **Installation**: `bun install -g @bluesky/cli`
- **Binary**: `bsky` command available globally

#### 9.1.2 GitHub Releases
- **Repository**: github.com/your-org/bluesky-cli
- **Release Assets**: Compiled binaries for macOS, Linux, Windows
- **Installation**: Download binary, add to PATH

#### 9.1.3 Homebrew (macOS/Linux)
- **Tap**: `brew tap your-org/bluesky-cli`
- **Installation**: `brew install bluesky-cli`

### 9.2 Release Process

#### 9.2.1 Version Numbering
- Follow Semantic Versioning (semver)
- Format: MAJOR.MINOR.PATCH
- Example: 1.0.0, 1.1.0, 1.1.1

#### 9.2.2 Release Checklist
- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Run full test suite
- [ ] Build production bundles
- [ ] Create GitHub release with notes
- [ ] Publish to npm
- [ ] Update Homebrew formula
- [ ] Announce on Bluesky
- [ ] Update documentation site

### 9.3 CI/CD Pipeline

#### 9.3.1 GitHub Actions Workflow
```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  release:
    types: [created]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test
      - run: bun run lint

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build

  publish:
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'release'
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 9.4 Documentation

#### 9.4.1 Documentation Site
- **Hosting**: GitHub Pages or Vercel
- **Framework**: VitePress or Docusaurus
- **Sections**:
  - Getting Started
  - Installation
  - Authentication
  - Commands Reference
  - Examples
  - Troubleshooting
  - API Documentation

#### 9.4.2 In-CLI Help
- `bsky --help`: Show all commands
- `bsky <command> --help`: Show command-specific help
- Include examples in help text
- Link to online documentation

---

## 10. Appendices

### 10.1 AT Protocol Resources

- **Official Documentation**: https://docs.bsky.app/
- **AT Protocol Specs**: https://atproto.com/specs/
- **@atproto/api SDK**: https://www.npmjs.com/package/@atproto/api
- **API Reference**: https://docs.bsky.app/docs/category/http-reference
- **Chat (DM) API**: https://docs.bsky.app/docs/api/chat-bsky-convo-send-message

### 10.2 Bun Resources

- **Official Docs**: https://bun.sh/docs
- **Package Manager**: https://bun.sh/docs/cli/install
- **Test Runner**: https://bun.sh/docs/cli/test
- **TypeScript Support**: https://bun.sh/docs/runtime/typescript

### 10.3 Related Projects

- **atproto-starter-kit**: https://github.com/aliceisjustplaying/atproto-starter-kit
- **Bluesky Social**: https://github.com/bluesky-social/atproto
- **AT Protocol SDK**: https://atproto.blue/

### 10.4 Glossary

| Term | Definition |
|------|------------|
| **AT Protocol** | Authenticated Transfer Protocol - the underlying protocol for Bluesky |
| **DID** | Decentralized Identifier - unique user identifier (e.g., did:plc:abc123) |
| **Handle** | Human-readable username (e.g., user.bsky.social) |
| **PDS** | Personal Data Server - stores user's data |
| **App Password** | Generated password for third-party apps (not main account password) |
| **JWT** | JSON Web Token - used for authentication |
| **Lexicon** | Schema definition for AT Protocol records |
| **Record** | Data item in AT Protocol (post, follow, like, etc.) |
| **URI** | AT Protocol URI format (at://did/collection/rkey) |
| **XRPC** | HTTP-based RPC protocol used by AT Protocol |

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-06 | Atlas (Principal Software Architect) | Initial SRD creation |

---

**End of Software Requirements Document**
