import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { describe, expect, it, vi } from 'vitest';
import { initializeAll, initializePlugin } from '../../../src/plugins/lifecycle/initialize';

function plugin(id: string, initialize?: IPlugin['initialize']): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '3',
    supportedExtensions: ['.test'],
    ...(initialize ? { initialize } : {}),
  };
}

describe('plugins/lifecycle/initialize', () => {
  it('initializes each plugin once with workspace analysis context options', async () => {
    const initialize = vi.fn();
    const info = {
      plugin: plugin('test', initialize),
      options: { includeTests: true },
    };
    const initialized = new Set<typeof info>();

    await initializePlugin(info, '/workspace', initialized);
    await initializePlugin(info, '/workspace', initialized);

    expect(initialized).toEqual(new Set([info]));
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(initialize).toHaveBeenCalledWith('/workspace', expect.objectContaining({
      options: { includeTests: true },
    }));
  });

  it('marks plugins without initialize hooks as initialized', async () => {
    const info = { plugin: plugin('metadata-only') };
    const initialized = new Set<typeof info>();

    await initializePlugin(info, '/workspace', initialized);

    expect(initialized).toEqual(new Set([info]));
  });

  it('initializes all plugins and allows failed plugins to retry later', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const firstInitialize = vi.fn();
    const failingError = new Error('boom');
    const failingInitialize = vi.fn(async () => {
      throw failingError;
    });
    const firstInfo = { plugin: plugin('first', firstInitialize) };
    const failingInfo = { plugin: plugin('failing', failingInitialize) };
    const initialized = new Set<typeof firstInfo>();

    await initializeAll(new Map([
      ['first', firstInfo],
      ['failing', failingInfo],
    ]), '/workspace', initialized);

    expect(initialized).toEqual(new Set([firstInfo]));
    expect(consoleError).toHaveBeenCalledWith(
      '[CodeGraphy] Error initializing plugin failing:',
      failingError,
    );
    consoleError.mockRestore();
  });
});
