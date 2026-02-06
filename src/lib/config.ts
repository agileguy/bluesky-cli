import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * Configuration schema for the Bluesky CLI
 */
export interface Config {
  defaultUsername?: string;
  colorOutput: boolean;
  verbose: boolean;
  apiEndpoint: string;
}

/**
 * Session data stored with encryption
 */
export interface Session {
  handle: string;
  did: string;
  accessJwt: string;
  refreshJwt: string;
  lastUsed: string;
}

/**
 * Default configuration template
 */
const DEFAULT_CONFIG: Config = {
  colorOutput: true,
  verbose: false,
  apiEndpoint: 'https://bsky.social',
};

/**
 * ConfigManager handles all configuration and session management
 * for the Bluesky CLI, including encryption of sensitive data.
 */
export class ConfigManager {
  private configDir: string;
  private configPath: string;
  private sessionPath: string;
  private encryptionKey: Buffer;

  constructor() {
    this.configDir = join(homedir(), '.config', 'bluesky-cli');
    this.configPath = join(this.configDir, 'config.json');
    this.sessionPath = join(this.configDir, 'session.json');

    // Derive encryption key from system-specific information
    // In production, this should use a more secure key derivation method
    const keyMaterial = `${homedir()}-bluesky-cli-v1`;
    this.encryptionKey = scryptSync(keyMaterial, 'salt', 32);

    this.ensureConfigDirectory();
  }

  /**
   * Ensures the config directory exists with proper permissions (0700)
   */
  private ensureConfigDirectory(): void {
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Validates that a file has secure permissions (0600)
   * @param filePath Path to the file to check
   * @throws Error if permissions are insecure
   */
  private validateFilePermissions(filePath: string): void {
    if (!existsSync(filePath)) {
      return;
    }

    const stats = statSync(filePath);
    const mode = stats.mode & parseInt('777', 8);

    // Check if file is readable/writable by group or others
    if (mode & parseInt('077', 8)) {
      throw new Error(
        `Insecure permissions on ${filePath}. Run: chmod 600 ${filePath}`
      );
    }
  }

  /**
   * Encrypts data using AES-256-GCM
   * @param plaintext Data to encrypt
   * @returns Encrypted data with IV and auth tag
   */
  private encrypt(plaintext: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts data encrypted with AES-256-GCM
   * @param encrypted Encrypted data with IV and auth tag
   * @returns Decrypted plaintext
   */
  private decrypt(encrypted: string): string {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0]!, 'hex');
    const authTag = Buffer.from(parts[1]!, 'hex');
    const encryptedData = parts[2]!;

    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Reads and validates the configuration file
   * @returns Configuration object or default config if file doesn't exist
   */
  public readConfig(): Config {
    try {
      if (!existsSync(this.configPath)) {
        return { ...DEFAULT_CONFIG };
      }

      this.validateFilePermissions(this.configPath);
      const data = readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(data) as Partial<Config>;

      // Merge with defaults to ensure all fields exist
      return { ...DEFAULT_CONFIG, ...config };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read config: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Writes configuration to disk with secure permissions
   * @param config Configuration object to write
   */
  public writeConfig(config: Config): void {
    try {
      this.ensureConfigDirectory();

      const data = JSON.stringify(config, null, 2);
      writeFileSync(this.configPath, data, { mode: 0o600 });

      // Ensure permissions are set correctly
      chmodSync(this.configPath, 0o600);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to write config: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Reads and decrypts the session file
   * @returns Session object or null if file doesn't exist
   */
  public readSession(): Session | null {
    try {
      if (!existsSync(this.sessionPath)) {
        return null;
      }

      this.validateFilePermissions(this.sessionPath);
      const encryptedData = readFileSync(this.sessionPath, 'utf8');

      // Return null if file is empty (cleared session)
      if (!encryptedData || encryptedData.trim() === '') {
        return null;
      }

      // Decrypt and parse
      const decryptedData = this.decrypt(encryptedData);
      return JSON.parse(decryptedData) as Session;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read session: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Encrypts and writes session data to disk with secure permissions
   * @param session Session object to write
   */
  public writeSession(session: Session): void {
    try {
      this.ensureConfigDirectory();

      // Encrypt session data
      const plaintext = JSON.stringify(session);
      const encrypted = this.encrypt(plaintext);

      writeFileSync(this.sessionPath, encrypted, { mode: 0o600 });

      // Ensure permissions are set correctly
      chmodSync(this.sessionPath, 0o600);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to write session: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Clears the current session
   */
  public clearSession(): void {
    try {
      if (existsSync(this.sessionPath)) {
        writeFileSync(this.sessionPath, '', { mode: 0o600 });
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to clear session: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Validates configuration schema
   * @param config Configuration object to validate
   * @throws Error if configuration is invalid
   */
  public validateConfig(config: Config): void {
    if (typeof config.colorOutput !== 'boolean') {
      throw new Error('colorOutput must be a boolean');
    }

    if (typeof config.verbose !== 'boolean') {
      throw new Error('verbose must be a boolean');
    }

    if (typeof config.apiEndpoint !== 'string' || !config.apiEndpoint.startsWith('https://')) {
      throw new Error('apiEndpoint must be a valid HTTPS URL');
    }

    if (config.defaultUsername !== undefined && typeof config.defaultUsername !== 'string') {
      throw new Error('defaultUsername must be a string');
    }
  }

  /**
   * Gets the config directory path
   */
  public getConfigDir(): string {
    return this.configDir;
  }

  /**
   * Gets the config file path
   */
  public getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Gets the session file path
   */
  public getSessionPath(): string {
    return this.sessionPath;
  }
}
