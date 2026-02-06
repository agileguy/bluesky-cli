import { BskyAgent } from '@atproto/api';
import type { AtpSessionData } from '@atproto/api';
import type { Session } from './config.js';
import { ConfigManager } from './config.js';
import { AuthError, fromApiError } from './errors.js';
import { withRetry, RetryProfiles } from './retry.js';
import { getDebugEnabled } from '../index.js';

// Re-export AuthError for backward compatibility
export { AuthError };

export class AuthManager {
  private agent: BskyAgent;
  private config: ConfigManager;

  constructor(config: ConfigManager, service?: string) {
    this.config = config;
    const configData = config.readConfig();
    const serviceUrl = service || configData.apiEndpoint;
    this.agent = new BskyAgent({ service: serviceUrl });
  }

  getAgent(): BskyAgent {
    return this.agent;
  }

  async login(identifier: string, password: string, service?: string): Promise<Session> {
    try {
      // If custom service provided, create new agent
      if (service && service !== this.agent.service.toString()) {
        this.agent = new BskyAgent({ service });
      }

      // Login with retry logic
      const response = await withRetry(
        () =>
          this.agent.login({
            identifier,
            password,
          }),
        {
          ...RetryProfiles.fast,
          onRetry: (attempt, error, delayMs) => {
            if (getDebugEnabled()) {
              console.error(`Login attempt ${attempt} failed, retrying in ${delayMs}ms...`);
              console.error(`Error: ${error.message}`);
            }
          },
        }
      );

      if (!response.success) {
        throw new AuthError('Login failed', { code: 'LOGIN_FAILED' });
      }

      const session: Session = {
        did: response.data.did,
        handle: response.data.handle,
        accessJwt: response.data.accessJwt,
        refreshJwt: response.data.refreshJwt,
        lastUsed: new Date().toISOString(),
      };

      this.config.writeSession(session);
      return session;
    } catch (error: any) {
      // Convert to appropriate error type
      throw fromApiError(error);
    }
  }

  async logout(): Promise<void> {
    // Clear local session
    this.config.clearSession();
  }

  async resumeSession(): Promise<boolean> {
    const session = this.config.readSession();
    if (!session) {
      return false;
    }

    try {
      // Restore session to agent with retry logic
      const sessionData: AtpSessionData = {
        did: session.did,
        handle: session.handle,
        accessJwt: session.accessJwt,
        refreshJwt: session.refreshJwt,
        active: true,
      };

      await withRetry(() => this.agent.resumeSession(sessionData), {
        ...RetryProfiles.fast,
        onRetry: (attempt, error, delayMs) => {
          if (getDebugEnabled()) {
            console.error(`Resume session attempt ${attempt} failed, retrying in ${delayMs}ms...`);
            console.error(`Error: ${error.message}`);
          }
        },
      });

      // Update last used timestamp
      session.lastUsed = new Date().toISOString();
      this.config.writeSession(session);

      return true;
    } catch (error: any) {
      // Session is invalid, clear it
      this.config.clearSession();
      throw new AuthError('Session expired - please login again', { code: 'SESSION_EXPIRED' });
    }
  }

  async validateSession(): Promise<boolean> {
    if (!this.agent.hasSession) {
      return false;
    }

    try {
      // Make a simple API call to verify session is valid
      await this.agent.getProfile({ actor: this.agent.session?.did || '' });
      return true;
    } catch (error: any) {
      if (error.status === 401 || error.message?.includes('ExpiredToken')) {
        // Try to refresh the session
        try {
          await this.refreshSession();
          return true;
        } catch (refreshError) {
          return false;
        }
      }
      // Other errors don't necessarily mean invalid session
      return false;
    }
  }

  async refreshSession(): Promise<void> {
    // Session refresh is handled automatically by the agent
    // Just update the last used timestamp
    const session = this.config.readSession();
    if (session) {
      session.lastUsed = new Date().toISOString();
      this.config.writeSession(session);
    }
  }

  getCurrentSession(): Session | null {
    return this.config.readSession();
  }

  isAuthenticated(): boolean {
    const session = this.config.readSession();
    return session !== null && this.agent.hasSession;
  }
}

export async function requireAuth(config: ConfigManager): Promise<AuthManager> {
  const auth = new AuthManager(config);
  const session = config.readSession();

  if (!session) {
    throw new AuthError('Not logged in. Run "bsky login" first.', { code: 'NOT_AUTHENTICATED' });
  }

  try {
    await auth.resumeSession();
  } catch (error) {
    throw error;
  }

  return auth;
}
