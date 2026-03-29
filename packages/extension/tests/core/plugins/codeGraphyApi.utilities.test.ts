import { describe, expect, it } from 'vitest';
import { createTestAPI } from './codeGraphyApi.test-utils';

describe('CodeGraphyAPIImpl utilities', () => {
  it('returns the workspace root', () => {
    const { api } = createTestAPI();
    expect(api.getWorkspaceRoot()).toBe('/workspace');
  });

  it('logs with the plugin prefix', () => {
    const { api, logFn } = createTestAPI('my-plugin');

    api.log('info', 'hello', 'world');

    expect(logFn).toHaveBeenCalledWith('info', '[my-plugin]', 'hello', 'world');
  });

  it('supports multiple log levels', () => {
    const { api, logFn } = createTestAPI();

    api.log('warn', 'warning message');
    api.log('error', 'error message');

    expect(logFn).toHaveBeenCalledTimes(2);
    expect(logFn).toHaveBeenCalledWith('warn', '[test-plugin]', 'warning message');
    expect(logFn).toHaveBeenCalledWith('error', '[test-plugin]', 'error message');
  });

  it('returns the plugin ID', () => {
    const { api } = createTestAPI('my-plugin');
    expect(api.pluginId).toBe('my-plugin');
  });
});
