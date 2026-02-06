import { BskyAgent } from '@atproto/api';
import type { AtpSessionData } from '@atproto/api';
import type { Session } from './config.js';
import { ConfigManager } from './config.js';

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

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

      const response = await this.agent.login({
        identifier,
        password,
      });

      if (!response.success) {
        throw new AuthError('Login failed', 'LOGIN_FAILED');
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
      // Sanitize error messages - only expose known error patterns
      if (error.message?.includes('Invalid identifier or password')) {
        throw new AuthError('Invalid handle or password', 'INVALID_CREDENTIALS');
      }
      if (
        error.message?.includes('Network') ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED'
      ) {
        throw new AuthError('Network error - check your connection', 'NETWORK_ERROR');
      }
      if (error instanceof AuthError) {
        throw error;
      }
      // For unknown errors, return generic message to avoid leaking sensitive information
      throw new AuthError(
        'Login failed - please check your credentials and try again',
        'LOGIN_FAILED'
      );
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
      // Restore session to agent
      const sessionData: AtpSessionData = {
        did: session.did,
        handle: session.handle,
        accessJwt: session.accessJwt,
        refreshJwt: session.refreshJwt,
        active: true,
      };
      await this.agent.resumeSession(sessionData);

      // Update last used timestamp
      session.lastUsed = new Date().toISOString();
      this.config.writeSession(session);

      return true;
    } catch (error: any) {
      // Session is invalid, clear it
      this.config.clearSession();
      throw new AuthError('Session expired - please login again', 'SESSION_EXPIRED');
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
    throw new AuthError('Not logged in. Run "bsky login" first.', 'NOT_AUTHENTICATED');
  }

  try {
    await auth.resumeSession();
  } catch (error) {
    throw error;
  }

  return auth;
}
