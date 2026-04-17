import { describe, expect, it, vi } from 'vitest';
import { CodeGraphyAPIImpl } from '../../../../src/core/plugins/api/instance';
import { callOnLoad, createPluginApi, type IApiDependencies } from '../../../../src/core/plugins/registry/runtime/registration/apiSetup';

function createDependencies(overrides: Partial<IApiDependencies> = {}): IApiDependencies {
  return {
    eventBus: {} as never,
    decorationManager: {} as never,
    viewRegistry: {} as never,
    graphProvider: (() => ({ nodes: [], edges: [] })) as never,
    commandRegistrar: vi.fn() as never,
    webviewSender: vi.fn() as never,
    workspaceRoot: '/workspace',
    ...overrides,
  };
}

describe('core/plugins/registry/runtime/apiSetup', () => {
  it('creates a scoped CodeGraphy API with the provided dependencies', () => {
    const logFn = vi.fn();
    const api = createPluginApi('plugin.test', createDependencies(), logFn);

    expect(api).toBeInstanceOf(CodeGraphyAPIImpl);

    const context = (api as unknown as { _context: { pluginId: string; workspaceRoot: string; logFn: typeof logFn } })._context;
    expect(context.pluginId).toBe('plugin.test');
    expect(context.workspaceRoot).toBe('/workspace');
    expect(context.logFn).toBe(logFn);
  });

  it('uses a no-op export saver when one is not provided', async () => {
    const api = createPluginApi('plugin.test', createDependencies(), vi.fn());
    const context = (api as unknown as { _context: { exportSaver: (name: string, data: Uint8Array) => Promise<void> } })._context;

    await expect(context.exportSaver('graph.json', new Uint8Array())).resolves.toBeUndefined();
  });

  it('invokes onLoad with the created api when present', () => {
    const api = createPluginApi('plugin.test', createDependencies(), vi.fn());
    const onLoad = vi.fn();

    callOnLoad({ id: 'plugin.test', onLoad } as never, api);

    expect(onLoad).toHaveBeenCalledWith(api);
  });

  it('ignores plugins without onLoad handlers', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const api = createPluginApi('plugin.test', createDependencies(), vi.fn());

    expect(() => callOnLoad({ id: 'plugin.test' } as never, api)).not.toThrow();
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('logs and swallows onLoad errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const api = createPluginApi('plugin.test', createDependencies(), vi.fn());

    expect(() => callOnLoad({
      id: 'plugin.test',
      onLoad: () => {
        throw new Error('boom');
      },
    } as never, api)).not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith(
      '[CodeGraphy] Error in onLoad for plugin plugin.test:',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});
