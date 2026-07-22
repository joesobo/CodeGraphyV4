import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getEffectiveCustomFilterPatterns,
  getEffectivePluginFilterPatterns,
  getPipelinePluginFilterGroups,
  getPipelinePluginFilterPatterns,
  initializeWorkspacePipelinePlugins,
  queueWorkspacePipelinePluginReload,
  queueWorkspacePipelinePluginSync,
} from '../../../../src/extension/pipeline/service/pluginState';
import {
  getWorkspacePipelinePluginFilterGroups,
  getWorkspacePipelinePluginFilterPatterns,
  initializeWorkspacePipeline,
  syncWorkspacePipelinePlugins,
} from '../../../../src/extension/pipeline/plugins/bootstrap';

vi.mock('../../../../src/extension/pipeline/plugins/bootstrap', () => ({
  getWorkspacePipelinePluginFilterGroups: vi.fn(),
  getWorkspacePipelinePluginFilterPatterns: vi.fn(),
  initializeWorkspacePipeline: vi.fn(),
  syncWorkspacePipelinePlugins: vi.fn(),
}));

function createDeferred(): {
  promise: Promise<void>;
  resolve(): void;
  reject(reason: unknown): void;
} {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

describe('extension/pipeline/service/pluginState', () => {
  const registry = {
    disposeAll: vi.fn(),
    id: 'registry',
  } as unknown as Parameters<typeof initializeWorkspacePipelinePlugins>[0] & {
    disposeAll: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkspacePipelinePluginFilterPatterns).mockReturnValue([
      'generated/**',
      'vendor/**',
      'node_modules/**',
    ]);
    vi.mocked(getWorkspacePipelinePluginFilterGroups).mockReturnValue([{
      patterns: ['generated/**'],
      pluginId: 'plugin.generated',
      pluginName: 'Generated Plugin',
    }]);
  });

  it('initializes workspace plugins with a live workspace-root callback', async () => {
    const getWorkspaceRoot = vi.fn(() => '/workspace');

    await initializeWorkspacePipelinePlugins(registry, getWorkspaceRoot);

    expect(initializeWorkspacePipeline).toHaveBeenCalledWith(registry, expect.objectContaining({
      getWorkspaceRoot,
    }));
    expect(vi.mocked(initializeWorkspacePipeline).mock.calls[0][1].getWorkspaceRoot()).toBe('/workspace');
  });

  it('queues plugin reload after existing work, disposes plugins, and initializes again', async () => {
    const existingWork = createDeferred();
    const initialize = vi.fn(async () => undefined);

    const { nextQueue, reload } = queueWorkspacePipelinePluginReload(
      existingWork.promise,
      registry,
      initialize,
    );

    await Promise.resolve();
    expect(registry.disposeAll).not.toHaveBeenCalled();
    expect(initialize).not.toHaveBeenCalled();

    existingWork.resolve();
    await reload;
    await nextQueue;

    expect(registry.disposeAll).toHaveBeenCalledOnce();
    expect(initialize).toHaveBeenCalledOnce();
    expect(registry.disposeAll.mock.invocationCallOrder[0]).toBeLessThan(
      initialize.mock.invocationCallOrder[0],
    );
  });

  it('keeps the reload queue usable when a reload fails', async () => {
    const initialize = vi.fn(async () => {
      throw new Error('reload failed');
    });

    const { nextQueue, reload } = queueWorkspacePipelinePluginReload(
      Promise.resolve(),
      registry,
      initialize,
    );

    await expect(reload).rejects.toThrow('reload failed');
    await expect(nextQueue).resolves.toBeUndefined();
  });

  it('queues workspace plugin sync with a live workspace-root callback', async () => {
    const existingWork = createDeferred();
    const getWorkspaceRoot = vi.fn(() => '/workspace');
    vi.mocked(syncWorkspacePipelinePlugins).mockImplementation(async (_registry, options) => {
      expect(options.getWorkspaceRoot()).toBe('/workspace');
    });

    const { nextQueue, sync } = queueWorkspacePipelinePluginSync(
      existingWork.promise,
      registry,
      getWorkspaceRoot,
    );

    await Promise.resolve();
    expect(syncWorkspacePipelinePlugins).not.toHaveBeenCalled();

    existingWork.resolve();
    await sync;
    await nextQueue;

    expect(syncWorkspacePipelinePlugins).toHaveBeenCalledWith(registry, expect.objectContaining({
      getWorkspaceRoot,
    }));
  });

  it('keeps the sync queue usable when a sync fails', async () => {
    vi.mocked(syncWorkspacePipelinePlugins).mockRejectedValueOnce(new Error('sync failed'));

    const { nextQueue, sync } = queueWorkspacePipelinePluginSync(
      Promise.resolve(),
      registry,
      () => '/workspace',
    );

    await expect(sync).rejects.toThrow('sync failed');
    await expect(nextQueue).resolves.toBeUndefined();
  });

  it('delegates plugin filter patterns and groups to bootstrap helpers', () => {
    const disabledPlugins = new Set(['plugin.disabled']);

    expect(getPipelinePluginFilterPatterns(registry, disabledPlugins)).toEqual([
      'generated/**',
      'vendor/**',
      'node_modules/**',
    ]);
    expect(getWorkspacePipelinePluginFilterPatterns).toHaveBeenCalledWith(registry, disabledPlugins);

    expect(getPipelinePluginFilterGroups(registry, disabledPlugins)).toEqual([{
      patterns: ['generated/**'],
      pluginId: 'plugin.generated',
      pluginName: 'Generated Plugin',
    }]);
    expect(getWorkspacePipelinePluginFilterGroups).toHaveBeenCalledWith(registry, disabledPlugins);
  });

  it('removes disabled custom and plugin filter patterns', () => {
    expect(getEffectiveCustomFilterPatterns(
      {
        disabledCustomFilterPatterns: ['vendor/**'],
        disabledPluginFilterPatterns: [],
      },
      ['generated/**', 'vendor/**', 'node_modules/**'],
    )).toEqual(['generated/**', 'node_modules/**']);

    expect(getEffectivePluginFilterPatterns(
      registry,
      {
        disabledCustomFilterPatterns: [],
        disabledPluginFilterPatterns: ['vendor/**'],
      },
      new Set(['plugin.disabled']),
    )).toEqual(['generated/**', 'node_modules/**']);
  });
});
