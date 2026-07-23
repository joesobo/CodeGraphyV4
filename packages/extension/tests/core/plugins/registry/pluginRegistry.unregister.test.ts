import { afterEach, describe, expect, it, vi } from 'vitest';
import { createConfiguredRegistry, createMockPlugin } from './pluginRegistry.testSupport';

describe('PluginRegistry unregister', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('unregisters a plugin', () => {
    const registry = createConfiguredRegistry();
    const plugin = createMockPlugin();

    registry.register(plugin);

    const result = registry.unregister(plugin.id);

    expect(result).toBe(true);
    expect(registry.size).toBe(0);
    expect(registry.get(plugin.id)).toBeUndefined();
  });

  it('returns false for non-existent plugin', () => {
    const registry = createConfiguredRegistry();

    expect(registry.unregister('non.existent')).toBe(false);
  });

  it('calls onUnload on the plugin', () => {
    const registry = createConfiguredRegistry();
    const onUnload = vi.fn();
    const plugin = createMockPlugin({ onUnload });

    registry.register(plugin);
    registry.unregister(plugin.id);

    expect(onUnload).toHaveBeenCalled();
  });

  it('calls onUnload after pending initialization settles', async () => {
    let markInitializationStarted!: () => void;
    let finishInitialization!: () => void;
    const initializationStarted = new Promise<void>((resolve) => {
      markInitializationStarted = resolve;
    });
    const initializationGate = new Promise<void>((resolve) => {
      finishInitialization = resolve;
    });
    const lifecycleCalls: string[] = [];
    let resourceActive = false;
    const registry = createConfiguredRegistry();
    const plugin = createMockPlugin({
      async initialize() {
        lifecycleCalls.push('initialize-start');
        markInitializationStarted();
        await initializationGate;
        lifecycleCalls.push('initialize-finish');
        resourceActive = true;
      },
      onUnload() {
        lifecycleCalls.push('unload');
        resourceActive = false;
      },
    });
    registry.register(plugin);

    const initialization = registry.initializePlugin(plugin.id, '/workspace');
    await initializationStarted;
    registry.unregister(plugin.id);
    finishInitialization();
    await initialization;

    expect(resourceActive).toBe(false);
    expect(lifecycleCalls).toEqual(['initialize-start', 'initialize-finish', 'unload']);
    expect(registry.get(plugin.id)).toBeUndefined();
  });

  it('keeps replacement initialization state when the old runtime fails later', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    let rejectOldInitialization!: (error: Error) => void;
    const oldInitialization = new Promise<void>((_resolve, reject) => {
      rejectOldInitialization = reject;
    });
    const registry = createConfiguredRegistry();
    const replacementInitialize = vi.fn();

    registry.register(createMockPlugin({
      id: 'replaceable',
      initialize: () => oldInitialization,
    }));
    const initializingOldRuntime = registry.initializePlugin('replaceable', '/workspace');
    registry.unregister('replaceable');
    registry.register(createMockPlugin({
      id: 'replaceable',
      initialize: replacementInitialize,
    }));
    await registry.initializePlugin('replaceable', '/workspace');

    rejectOldInitialization(new Error('old runtime failed'));
    await initializingOldRuntime;
    await registry.initializePlugin('replaceable', '/workspace');

    expect(replacementInitialize).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it('waits for an active analysis callback before unloading its plugin', async () => {
    let markAnalysisStarted!: () => void;
    let finishAnalysis!: () => void;
    const analysisStarted = new Promise<void>(resolve => {
      markAnalysisStarted = resolve;
    });
    const analysisGate = new Promise<void>(resolve => {
      finishAnalysis = resolve;
    });
    const onUnload = vi.fn();
    const registry = createConfiguredRegistry();
    const plugin = createMockPlugin({
      async analyzeFile(filePath) {
        markAnalysisStarted();
        await analysisGate;
        return { filePath, relations: [] };
      },
      onUnload,
    });
    registry.register(plugin);

    const analysis = registry.analyzeFileResult('src/app.test', '', '/workspace');
    await analysisStarted;
    registry.unregister(plugin.id);

    expect(registry.get(plugin.id)).toBeUndefined();
    expect(onUnload).not.toHaveBeenCalled();

    finishAnalysis();
    await analysis;

    expect(onUnload).toHaveBeenCalledOnce();
  });

  it('removes plugin from extension map', () => {
    const registry = createConfiguredRegistry();
    const plugin = createMockPlugin({ supportedExtensions: ['.ts'] });

    registry.register(plugin);
    expect(registry.supportsFile('app.ts')).toBe(true);

    registry.unregister(plugin.id);

    expect(registry.supportsFile('app.ts')).toBe(false);
  });

  it('does not log core-only built-ins as user-facing plugin unregistrations', () => {
    const registry = createConfiguredRegistry();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const plugin = createMockPlugin({
      id: 'test.plugin',
      name: 'Test Plugin',
    });

    registry.register(plugin, { builtIn: true });
    logSpy.mockClear();

    registry.unregister(plugin.id);

    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Unregistered plugin: test.plugin'),
    );
  });
});
