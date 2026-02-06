/**
 * Basic tests for ConfigManager
 * Run with: bun test tests/config.test.ts
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { ConfigManager } from '../src/lib/config';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const configDir = join(homedir(), '.config', 'bluesky-cli');

  beforeEach(() => {
    // Clean up any existing config directory from previous tests
    if (existsSync(configDir)) {
      rmSync(configDir, { recursive: true, force: true });
    }
    // Create a fresh config manager for each test
    configManager = new ConfigManager();
  });

  afterEach(() => {
    // Cleanup after each test
    if (existsSync(configDir)) {
      rmSync(configDir, { recursive: true, force: true });
    }
  });

  test('should create config directory', () => {
    expect(existsSync(configManager.getConfigDir())).toBe(true);
  });

  test('should read default config when no config exists', () => {
    const config = configManager.readConfig();
    expect(config.colorOutput).toBe(true);
    expect(config.verbose).toBe(false);
    expect(config.apiEndpoint).toBe('https://bsky.social');
  });

  test('should write and read config', () => {
    const testConfig = {
      defaultUsername: 'test.bsky.social',
      colorOutput: false,
      verbose: true,
      apiEndpoint: 'https://bsky.social',
    };

    configManager.writeConfig(testConfig);
    const readConfig = configManager.readConfig();

    expect(readConfig.defaultUsername).toBe('test.bsky.social');
    expect(readConfig.colorOutput).toBe(false);
    expect(readConfig.verbose).toBe(true);
  });

  test('should validate config schema', () => {
    const validConfig = {
      colorOutput: true,
      verbose: false,
      apiEndpoint: 'https://bsky.social',
    };

    expect(() => configManager.validateConfig(validConfig)).not.toThrow();

    const invalidConfig = {
      colorOutput: 'true', // Should be boolean
      verbose: false,
      apiEndpoint: 'https://bsky.social',
    };

    expect(() => configManager.validateConfig(invalidConfig as any)).toThrow();
  });

  test('should write and read encrypted session', () => {
    const testSession = {
      handle: 'test.bsky.social',
      did: 'did:plc:test123',
      accessJwt: 'test-access-token',
      refreshJwt: 'test-refresh-token',
      lastUsed: new Date().toISOString(),
    };

    configManager.writeSession(testSession);
    const readSession = configManager.readSession();

    expect(readSession).not.toBeNull();
    expect(readSession?.handle).toBe(testSession.handle);
    expect(readSession?.did).toBe(testSession.did);
    expect(readSession?.accessJwt).toBe(testSession.accessJwt);
    expect(readSession?.refreshJwt).toBe(testSession.refreshJwt);
  });

  test('should return null when no session exists', () => {
    const session = configManager.readSession();
    expect(session).toBeNull();
  });

  test('should clear session', () => {
    const testSession = {
      handle: 'test.bsky.social',
      did: 'did:plc:test123',
      accessJwt: 'test-access-token',
      refreshJwt: 'test-refresh-token',
      lastUsed: new Date().toISOString(),
    };

    configManager.writeSession(testSession);
    expect(configManager.readSession()).not.toBeNull();

    configManager.clearSession();
    expect(configManager.readSession()).toBeNull();
  });
});
