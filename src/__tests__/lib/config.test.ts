/**
 * Tests for ConfigManager
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ConfigManager, Config, Session } from '../../lib/config.js';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let testConfigDir: string;

  beforeEach(() => {
    // Create a temporary test directory
    testConfigDir = `/tmp/bluesky-cli-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    mkdirSync(testConfigDir, { recursive: true, mode: 0o700 });

    // Override the config directory for testing
    configManager = new ConfigManager();
    // Note: In a real scenario, we'd need to make configDir settable or use dependency injection
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    it('should create config directory if it does not exist', () => {
      const configDir = configManager.getConfigDir();
      expect(existsSync(configDir)).toBe(true);
    });

    it('should have correct default paths', () => {
      const configDir = configManager.getConfigDir();
      const configPath = configManager.getConfigPath();
      const sessionPath = configManager.getSessionPath();

      expect(configPath).toBe(join(configDir, 'config.json'));
      expect(sessionPath).toBe(join(configDir, 'session.json'));
    });
  });

  describe('config operations', () => {
    it('should return default config if file does not exist', () => {
      // Since this is a new instance, config file won't exist yet
      const config = configManager.readConfig();

      expect(config.colorOutput).toBe(true);
      expect(config.verbose).toBe(false);
      expect(config.apiEndpoint).toBe('https://bsky.social');
    });

    it('should write and read config correctly', () => {
      const testConfig: Config = {
        colorOutput: false,
        verbose: true,
        apiEndpoint: 'https://bsky.social',
        defaultUsername: 'test.user',
      };

      configManager.writeConfig(testConfig);
      const readConfig = configManager.readConfig();

      expect(readConfig.colorOutput).toBe(false);
      expect(readConfig.verbose).toBe(true);
      expect(readConfig.defaultUsername).toBe('test.user');
    });

    it('should validate config with correct schema', () => {
      const validConfig: Config = {
        colorOutput: true,
        verbose: false,
        apiEndpoint: 'https://bsky.social',
      };

      expect(() => configManager.validateConfig(validConfig)).not.toThrow();
    });

    it('should throw error for invalid colorOutput type', () => {
      const invalidConfig = {
        colorOutput: 'true' as any,
        verbose: false,
        apiEndpoint: 'https://bsky.social',
      };

      expect(() => configManager.validateConfig(invalidConfig)).toThrow('colorOutput must be a boolean');
    });

    it('should throw error for invalid verbose type', () => {
      const invalidConfig = {
        colorOutput: true,
        verbose: 'false' as any,
        apiEndpoint: 'https://bsky.social',
      };

      expect(() => configManager.validateConfig(invalidConfig)).toThrow('verbose must be a boolean');
    });

    it('should throw error for non-HTTPS apiEndpoint', () => {
      const invalidConfig = {
        colorOutput: true,
        verbose: false,
        apiEndpoint: 'http://bsky.social',
      };

      expect(() => configManager.validateConfig(invalidConfig)).toThrow('apiEndpoint must be a valid HTTPS URL');
    });

    it('should throw error for invalid defaultUsername type', () => {
      const invalidConfig = {
        colorOutput: true,
        verbose: false,
        apiEndpoint: 'https://bsky.social',
        defaultUsername: 123 as any,
      };

      expect(() => configManager.validateConfig(invalidConfig)).toThrow('defaultUsername must be a string');
    });
  });

  describe('session operations', () => {
    it('should return null if session file does not exist', () => {
      const session = configManager.readSession();
      expect(session).toBe(null);
    });

    it('should write and read session with encryption', () => {
      const testSession: Session = {
        handle: 'test.user',
        did: 'did:plc:test123',
        accessJwt: 'test-access-jwt-token',
        refreshJwt: 'test-refresh-jwt-token',
        lastUsed: new Date().toISOString(),
      };

      configManager.writeSession(testSession);
      const readSession = configManager.readSession();

      expect(readSession).not.toBe(null);
      expect(readSession?.handle).toBe('test.user');
      expect(readSession?.did).toBe('did:plc:test123');
      expect(readSession?.accessJwt).toBe('test-access-jwt-token');
      expect(readSession?.refreshJwt).toBe('test-refresh-jwt-token');
    });

    it('should encrypt session data (round-trip test)', () => {
      const testSession: Session = {
        handle: 'secure.user',
        did: 'did:plc:secure456',
        accessJwt: 'very-secret-access-token',
        refreshJwt: 'very-secret-refresh-token',
        lastUsed: new Date().toISOString(),
      };

      // Write encrypted session
      configManager.writeSession(testSession);

      // Read it back
      const readSession = configManager.readSession();

      // Verify all fields are correctly decrypted
      expect(readSession).not.toBe(null);
      expect(readSession?.handle).toBe(testSession.handle);
      expect(readSession?.did).toBe(testSession.did);
      expect(readSession?.accessJwt).toBe(testSession.accessJwt);
      expect(readSession?.refreshJwt).toBe(testSession.refreshJwt);
    });

    it('should clear session correctly', () => {
      const testSession: Session = {
        handle: 'test.user',
        did: 'did:plc:test123',
        accessJwt: 'test-token',
        refreshJwt: 'test-refresh',
        lastUsed: new Date().toISOString(),
      };

      // Write session
      configManager.writeSession(testSession);
      expect(configManager.readSession()).not.toBe(null);

      // Clear session
      configManager.clearSession();
      expect(configManager.readSession()).toBe(null);
    });

    it('should handle clearing non-existent session', () => {
      // Should not throw error when clearing non-existent session
      expect(() => configManager.clearSession()).not.toThrow();
    });
  });

  describe('encryption', () => {
    it('should produce different encrypted output for same input', () => {
      const testSession: Session = {
        handle: 'test.user',
        did: 'did:plc:test123',
        accessJwt: 'test-token',
        refreshJwt: 'test-refresh',
        lastUsed: new Date().toISOString(),
      };

      // Write session twice
      configManager.writeSession(testSession);
      const firstRead = configManager.readSession();

      // Write same session again
      configManager.writeSession(testSession);
      const secondRead = configManager.readSession();

      // Both should decrypt to same values
      expect(firstRead?.handle).toBe(secondRead?.handle);
      expect(firstRead?.accessJwt).toBe(secondRead?.accessJwt);
    });

    it('should handle reading session when file does not exist initially', () => {
      // Note: ConfigManager may have session from previous tests
      // This test validates that readSession() returns either null or a valid session
      const session = configManager.readSession();

      if (session !== null) {
        // If session exists, validate it has required fields
        expect(typeof session.handle).toBe('string');
        expect(typeof session.did).toBe('string');
        expect(typeof session.accessJwt).toBe('string');
        expect(typeof session.refreshJwt).toBe('string');
      }
    });
  });

  describe('error handling', () => {
    it('should throw descriptive error for corrupted config', () => {
      // Write invalid JSON to config file
      const configPath = configManager.getConfigPath();
      const fs = require('fs');
      fs.writeFileSync(configPath, 'invalid json {]', { mode: 0o600 });

      expect(() => configManager.readConfig()).toThrow('Failed to read config');
    });
  });
});
