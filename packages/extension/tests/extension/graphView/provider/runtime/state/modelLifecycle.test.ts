import { beforeEach, describe, expect, it } from 'vitest';
import {
  createContext,
  getStateHarness,
  resetStateHarness,
  TestRuntimeState,
  vscode,
} from './model.fixture';

const stateHarness = getStateHarness();

describe('graphView/provider/runtime/state/model', () => {
  beforeEach(resetStateHarness);

  it('initializes core runtime wiring and loads persisted settings state', () => {
    const context = createContext();
    const runtime = new TestRuntimeState(
      vscode.Uri.file('/extension'),
      context as never,
    ) as TestRuntimeState & {
      _depthMode: boolean;
      _nodeSizeMode: string;
      _pluginExtensionUris: Map<string, unknown>;
      _firstWorkspaceReadyPromise: Promise<void>;
      _resolveFirstWorkspaceReady?: () => void;
      _methodContainers: typeof stateHarness.methodContainers;
      _graphData: { nodes: unknown[]; edges: unknown[] };
    };
    const initializeArgs = stateHarness.initializeRuntimeStateServices.mock.calls[0] as [
      {
        _analyzer: unknown;
        _context: unknown;
        _viewRegistry: unknown;
        _eventBus: unknown;
        _decorationManager: unknown;
      },
      () => unknown,
      () => unknown,
    ];

    expect(stateHarness.analyzerInstances).toHaveLength(1);
    expect(stateHarness.analyzerInstances[0]?.warmGraphCache).toHaveBeenCalledOnce();
    expect(stateHarness.initializeRuntimeStateServices).toHaveBeenCalledOnce();
    expect(stateHarness.restorePersistedRuntimeState).toHaveBeenCalledWith(
      context,
      'connections',
    );
    expect(stateHarness.createGraphViewProviderMethodContainers).toHaveBeenCalledOnce();
    expect(stateHarness.defineGraphViewProviderMethodAccessors).toHaveBeenCalledOnce();
    expect(stateHarness.assignGraphViewProviderPublicMethods).toHaveBeenCalledOnce();
    expect(runtime.viewRegistry).toBeDefined();
    expect(runtime._depthMode).toBe(true);
    expect(runtime._nodeSizeMode).toBe('connections');
    expect(runtime._pluginExtensionUris).toBeInstanceOf(Map);
    expect(runtime._methodContainers.settingsState._loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
    expect(context.subscriptions).toHaveLength(1);
    expect(runtime._firstWorkspaceReadyPromise).toBeInstanceOf(Promise);
    expect(runtime._resolveFirstWorkspaceReady).toEqual(expect.any(Function));
    expect(initializeArgs[0]._analyzer).toBe(
      (runtime as unknown as { _analyzer: unknown })._analyzer,
    );
    expect(initializeArgs[0]._context).toBe(context);
    expect(initializeArgs[0]._viewRegistry).toBe(runtime.viewRegistry);
    expect(initializeArgs[0]._eventBus).toBe(
      (runtime as unknown as { _eventBus: unknown })._eventBus,
    );
    expect(initializeArgs[0]._decorationManager).toBe(
      (runtime as unknown as { _decorationManager: unknown })._decorationManager,
    );
    expect(initializeArgs[1]()).toBe(runtime._graphData);
    expect(initializeArgs[2]()).toBe(runtime._methodContainers);
  });

  it('delegates graph visibility and invalidation helpers', () => {
    const runtime = new TestRuntimeState(
      vscode.Uri.file('/extension'),
      createContext() as never,
    );
    stateHarness.isGraphViewVisible.mockReturnValue(true);

    expect(runtime.isGraphOpen()).toBe(true);
    expect(runtime.invalidateWorkspaceFiles(['/workspace/src/a.ts'])).toEqual(['/workspace/src/a.ts']);
    expect(runtime.invalidatePluginFiles(['plugin.markdown'])).toEqual(['plugin.markdown']);
    expect(stateHarness.invalidateWorkspaceFiles).toHaveBeenCalledWith(expect.anything(), ['/workspace/src/a.ts']);
    expect(stateHarness.invalidatePluginFiles).toHaveBeenCalledWith(expect.anything(), ['plugin.markdown']);
  });

  it('disposes the pipeline and emitter from the registered host subscription', () => {
    const context = createContext();
    const runtime = new TestRuntimeState(
      vscode.Uri.file('/extension'),
      context as never,
    );

    runtime.notify({ type: 'EXTENSION_MESSAGE' });
    context.subscriptions[0]?.dispose();

    expect(stateHarness.extensionMessageEmitter.fire).toHaveBeenCalledWith({
      type: 'EXTENSION_MESSAGE',
    });
    expect(stateHarness.extensionMessageEmitter.dispose).toHaveBeenCalledOnce();
    expect(stateHarness.analyzerInstances[0]?.dispose).toHaveBeenCalledOnce();
  });

  it('tracks installed plugin activation promises', () => {
    const runtime = new TestRuntimeState(
      vscode.Uri.file('/extension'),
      createContext() as never,
    ) as TestRuntimeState & {
      _installedPluginActivationPromise: Promise<void>;
    };
    const activationPromise = Promise.resolve();

    runtime.setInstalledPluginActivationPromise(activationPromise);

    expect(runtime._installedPluginActivationPromise).toBe(activationPromise);
  });
});
