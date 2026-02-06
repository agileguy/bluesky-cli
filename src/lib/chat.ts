import { BskyAgent } from '@atproto/api';
import type { ChatBskyConvoDefs } from '@atproto/api';

/**
 * Error class for DM/Chat-related errors
 */
export class ChatError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ChatError';
  }
}

/**
 * Rate limiting configuration for DM API
 * The chat service has stricter rate limits than the main API
 */
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  requests: number[];
}

/**
 * ChatClient wraps the Bluesky DM/Chat API
 * Handles communication with the chat service (api.bsky.chat)
 */
export class ChatClient {
  private agent: BskyAgent;
  private rateLimit: RateLimitConfig;

  /**
   * Chat service endpoint and proxy configuration
   * Note: These constants are kept for documentation purposes.
   * The @atproto/api library handles the chat service routing internally.
   */
  // private static readonly CHAT_SERVICE = 'https://api.bsky.chat';
  // private static readonly CHAT_PROXY_HEADER = 'did:web:api.bsky.chat#bsky_chat';

  constructor(agent: BskyAgent) {
    this.agent = agent;
    // Initialize rate limiting: 30 requests per minute
    this.rateLimit = {
      maxRequests: 30,
      windowMs: 60000,
      requests: [],
    };
  }

  /**
   * Check and enforce rate limiting
   * @throws ChatError if rate limit exceeded
   */
  private checkRateLimit(): void {
    const now = Date.now();
    const windowStart = now - this.rateLimit.windowMs;

    // Remove requests outside the current window
    this.rateLimit.requests = this.rateLimit.requests.filter((time) => time > windowStart);

    // Check if we've exceeded the limit
    if (this.rateLimit.requests.length >= this.rateLimit.maxRequests) {
      const oldestRequest = this.rateLimit.requests[0];
      const resetTime = oldestRequest! + this.rateLimit.windowMs;
      const waitSeconds = Math.ceil((resetTime - now) / 1000);

      throw new ChatError(
        `Rate limit exceeded. Please wait ${waitSeconds} seconds before trying again.`,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Record this request
    this.rateLimit.requests.push(now);
  }

  /**
   * Handle DM API errors with user-friendly messages
   */
  private handleError(error: any, operation: string): never {
    // Check for common error patterns
    if (error.status === 401) {
      throw new ChatError('Session expired - please login again', 'SESSION_EXPIRED');
    }

    if (error.status === 403) {
      throw new ChatError(
        'Direct messaging is not enabled for your account',
        'DM_NOT_ENABLED'
      );
    }

    if (error.status === 404) {
      throw new ChatError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    if (error.status === 429) {
      throw new ChatError(
        'Rate limit exceeded - please wait before trying again',
        'RATE_LIMIT_EXCEEDED'
      );
    }

    if (error.message?.includes('Network') || error.code === 'ENOTFOUND') {
      throw new ChatError('Network error - check your connection', 'NETWORK_ERROR');
    }

    if (error instanceof ChatError) {
      throw error;
    }

    // Generic error message
    throw new ChatError(
      `Failed to ${operation}: ${error.message || 'Unknown error'}`,
      'CHAT_ERROR'
    );
  }

  /**
   * List conversations (DMs)
   * @param options Query options for listing conversations
   * @returns List of conversations with pagination cursor
   */
  async getConvos(options?: {
    limit?: number;
    cursor?: string;
    unreadOnly?: boolean;
  }): Promise<{
    convos: ChatBskyConvoDefs.ConvoView[];
    cursor?: string;
  }> {
    try {
      this.checkRateLimit();

      const queryParams: any = {
        limit: options?.limit || 20,
      };

      if (options?.cursor) {
        queryParams.cursor = options.cursor;
      }

      if (options?.unreadOnly) {
        queryParams.readState = 'unread';
      }

      // Use the chat namespace from the agent
      const response = await this.agent.chat.bsky.convo.listConvos(queryParams);

      if (!response.success) {
        throw new ChatError('Failed to fetch conversations', 'FETCH_FAILED');
      }

      return {
        convos: response.data.convos,
        cursor: response.data.cursor,
      };
    } catch (error) {
      return this.handleError(error, 'fetch conversations');
    }
  }

  /**
   * Get a single conversation by ID
   * @param convoId The conversation ID
   * @returns The conversation details
   */
  async getConvo(convoId: string): Promise<ChatBskyConvoDefs.ConvoView> {
    try {
      this.checkRateLimit();

      const response = await this.agent.chat.bsky.convo.getConvo({
        convoId,
      });

      if (!response.success) {
        throw new ChatError('Failed to fetch conversation', 'FETCH_FAILED');
      }

      return response.data.convo;
    } catch (error) {
      return this.handleError(error, 'fetch conversation');
    }
  }

  /**
   * Get messages in a conversation
   * @param convoId The conversation ID
   * @param options Query options for fetching messages
   * @returns Messages in the conversation with pagination cursor
   */
  async getMessages(
    convoId: string,
    options?: {
      limit?: number;
      cursor?: string;
    }
  ): Promise<{
    messages: (ChatBskyConvoDefs.MessageView | ChatBskyConvoDefs.DeletedMessageView)[];
    cursor?: string;
  }> {
    try {
      this.checkRateLimit();

      const queryParams: any = {
        convoId,
        limit: options?.limit || 50,
      };

      if (options?.cursor) {
        queryParams.cursor = options.cursor;
      }

      const response = await this.agent.chat.bsky.convo.getMessages(queryParams);

      if (!response.success) {
        throw new ChatError('Failed to fetch messages', 'FETCH_FAILED');
      }

      return {
        messages: response.data.messages as any,
        cursor: response.data.cursor,
      };
    } catch (error) {
      return this.handleError(error, 'fetch messages');
    }
  }

  /**
   * Find a conversation by participant handle
   * Searches through conversations to find one with the specified participant
   * @param handle The handle of the participant to find
   * @returns The conversation ID if found, null otherwise
   */
  async findConvoByHandle(handle: string): Promise<string | null> {
    try {
      // Normalize handle (remove @ if present)
      const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;

      // Fetch all conversations (may need pagination for users with many DMs)
      let cursor: string | undefined;
      let foundConvoId: string | null = null;

      // Search through conversations (max 100 to avoid excessive API calls)
      for (let i = 0; i < 5 && !foundConvoId; i++) {
        const { convos, cursor: nextCursor } = await this.getConvos({
          limit: 20,
          cursor,
        });

        // Search for the handle in conversation members
        for (const convo of convos) {
          const hasParticipant = convo.members.some(
            (member) =>
              member.handle === normalizedHandle || member.handle === `@${normalizedHandle}`
          );

          if (hasParticipant) {
            foundConvoId = convo.id;
            break;
          }
        }

        if (!nextCursor) {
          break;
        }

        cursor = nextCursor;
      }

      return foundConvoId;
    } catch (error) {
      // Don't throw error here, just return null
      console.error(`Error finding conversation: ${error}`);
      return null;
    }
  }

  /**
   * Get a conversation by participant handle
   * This is a convenience method that combines findConvoByHandle and getConvo
   * @param handle The handle of the participant
   * @returns The conversation if found
   * @throws ChatError if conversation not found
   */
  async getConvoByHandle(handle: string): Promise<ChatBskyConvoDefs.ConvoView> {
    const convoId = await this.findConvoByHandle(handle);

    if (!convoId) {
      throw new ChatError(
        `No conversation found with ${handle}`,
        'CONVERSATION_NOT_FOUND'
      );
    }

    return this.getConvo(convoId);
  }
}
