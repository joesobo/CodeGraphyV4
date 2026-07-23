import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { describe, expect, it, vi } from 'vitest';

import { CorePluginRegistry } from '../../src';

function plugin(overrides: Partial<IPlugin> = {}): IPlugin {
  return {
    id: 'codegraphy.test',
    name: 'Test',
    version: '1.0.0',
    apiVersion: '4',
    supportedExtensions: ['.test'],
    ...overrides,
  };
}

describe('CorePluginRegistry', () => {
  it('accepts the same major-only plugin API shorthand as package manifests', () => {
    const registry = new CorePluginRegistry();

    expect(() => registry.register(plugin({
      id: 'codegraphy.test-major-api',
      name: 'Test Major API',
    }))).not.toThrow();
  });

  it('stores registered plugin metadata and rejects duplicate ids', () => {
    const registry = new CorePluginRegistry();
    const registeredPlugin = plugin({
      defaultFilters: ['**/generated/**'],
      supportedExtensions: ['TEST', '*'],
    });

    registry.register(registeredPlugin, {
      builtIn: true,
      sourcePackage: '@codegraphy-dev/plugin-test',
      options: { includeTests: true },
    });

    expect(registry.get('codegraphy.test')).toEqual({
      plugin: registeredPlugin,
      builtIn: true,
      sourcePackage: '@codegraphy-dev/plugin-test',
      options: { includeTests: true },
    });
    expect(registry.list()).toHaveLength(1);
    expect(registry.getSupportedExtensions()).toEqual(['.test', '*']);
    expect(registry.getPluginForFile('src/app.test')).toBe(registeredPlugin);
    expect(registry.getPluginsForExtension('.TEST')).toEqual([registeredPlugin, registeredPlugin]);
    expect(registry.supportsFile('src/app.anything')).toBe(true);
    expect(registry.getPluginFilterPatterns()).toEqual(['**/generated/**']);
    expect(registry.getPluginFilterPatterns(new Set(['codegraphy.test']))).toEqual([]);
    expect(() => registry.register(registeredPlugin)).toThrow("Plugin with ID 'codegraphy.test' is already registered");
  });

  it('delegates analysis and lifecycle notifications through registered plugins', async () => {
    const registry = new CorePluginRegistry();
    const onPreAnalyze = vi.fn();
    const onFilesChanged = vi.fn(async () => ['src/app.test']);
    const onPostAnalyze = vi.fn();
    const onWorkspaceReady = vi.fn();
    const onGraphRebuild = vi.fn();
    const graph = { nodes: [], edges: [] };

    registry.register(plugin({
      onPreAnalyze,
      onFilesChanged,
      onPostAnalyze,
      onWorkspaceReady,
      onGraphRebuild,
      analyzeFile: async filePath => ({
        filePath,
        relations: [{
          kind: 'reference',
          sourceId: 'test-reference',
          fromFilePath: filePath,
          toFilePath: 'target.test',
        }],
      }),
    }));
    registry.setCoreAnalyzeFileResult(async filePath => ({
      filePath,
      relations: [{
        kind: 'import',
        sourceId: 'core-import',
        fromFilePath: filePath,
        toFilePath: 'core.test',
      }],
    }));

    await expect(registry.analyzeFileResult('src/app.test', 'content', '/workspace')).resolves.toMatchObject({
      filePath: 'src/app.test',
      relations: expect.arrayContaining([
        expect.objectContaining({ sourceId: 'core-import' }),
        expect.objectContaining({ sourceId: 'test-reference', pluginId: 'codegraphy.test' }),
      ]),
    });
    await expect(registry.analyzeFile('src/app.test', 'content', '/workspace')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: 'core-import' }),
        expect.objectContaining({ sourceId: 'test-reference', pluginId: 'codegraphy.test' }),
      ]),
    );
    await registry.notifyPreAnalyze([{ absolutePath: '/workspace/src/app.test', relativePath: 'src/app.test', content: '' }], '/workspace');
    await expect(registry.notifyFilesChanged(
      [{ absolutePath: '/workspace/src/app.test', relativePath: 'src/app.test', content: '' }],
      '/workspace',
    )).resolves.toEqual({ additionalFilePaths: ['src/app.test'], requiresFullRefresh: false });
    registry.notifyPostAnalyze(graph);
    registry.notifyWorkspaceReady(graph);
    registry.notifyGraphRebuild(graph);

    expect(onPreAnalyze).toHaveBeenCalled();
    expect(onFilesChanged).toHaveBeenCalled();
    expect(onPostAnalyze).toHaveBeenCalledWith(graph);
    expect(onWorkspaceReady).toHaveBeenCalledWith(graph);
    expect(onGraphRebuild).toHaveBeenCalledWith(graph);
  });

  it('does not analyze or notify disabled plugins', async () => {
    const registry = new CorePluginRegistry();
    const activeAnalyzeFile = vi.fn(async filePath => ({ filePath, relations: [] }));
    const disabledAnalyzeFile = vi.fn(async filePath => ({
      filePath,
      relations: [{ kind: 'reference' as const, sourceId: 'disabled', fromFilePath: filePath, toFilePath: 'target.test' }],
    }));
    const disabledOnPreAnalyze = vi.fn();
    const disabledOnFilesChanged = vi.fn(async () => ['src/extra.test']);
    const disabledOnPostAnalyze = vi.fn();
    const disabledOnWorkspaceReady = vi.fn();
    const disabledOnGraphRebuild = vi.fn();
    const disabledPlugins = new Set(['disabled']);
    const files = [{ absolutePath: '/workspace/src/app.test', relativePath: 'src/app.test', content: '' }];
    const graph = { nodes: [], edges: [] };

    registry.register(plugin({ id: 'active', analyzeFile: activeAnalyzeFile }));
    registry.register(plugin({
      id: 'disabled',
      analyzeFile: disabledAnalyzeFile,
      onPreAnalyze: disabledOnPreAnalyze,
      onFilesChanged: disabledOnFilesChanged,
      onPostAnalyze: disabledOnPostAnalyze,
      onWorkspaceReady: disabledOnWorkspaceReady,
      onGraphRebuild: disabledOnGraphRebuild,
    }));

    await expect(registry.analyzeFileResult(
      'src/app.test',
      'content',
      '/workspace',
      undefined,
      { disabledPlugins },
    )).resolves.toMatchObject({
      relations: [],
    });
    await registry.notifyPreAnalyze(files, '/workspace', undefined, disabledPlugins);
    await expect(registry.notifyFilesChanged(files, '/workspace', undefined, disabledPlugins))
      .resolves.toEqual({ additionalFilePaths: [], requiresFullRefresh: false });
    registry.notifyPostAnalyze(graph, disabledPlugins);
    registry.notifyWorkspaceReady(graph, disabledPlugins);
    registry.notifyGraphRebuild(graph, disabledPlugins);

    expect(activeAnalyzeFile).toHaveBeenCalledOnce();
    expect(disabledAnalyzeFile).not.toHaveBeenCalled();
    expect(disabledOnPreAnalyze).not.toHaveBeenCalled();
    expect(disabledOnFilesChanged).not.toHaveBeenCalled();
    expect(disabledOnPostAnalyze).not.toHaveBeenCalled();
    expect(disabledOnWorkspaceReady).not.toHaveBeenCalled();
    expect(disabledOnGraphRebuild).not.toHaveBeenCalled();
  });

  it('initializes registered plugins through the registry facade', async () => {
    const registry = new CorePluginRegistry();
    const firstInitialize = vi.fn();
    const secondInitialize = vi.fn();

    registry.register(plugin({ id: 'first', initialize: firstInitialize }));
    registry.register(plugin({ id: 'second', initialize: secondInitialize }));

    await registry.initializePlugin('missing', '/workspace');
    await registry.initializePlugin('first', '/workspace');
    expect(firstInitialize).toHaveBeenCalledTimes(1);
    await registry.initializePlugin('first', '/workspace');
    expect(firstInitialize).toHaveBeenCalledTimes(1);
    await registry.initializeAll('/workspace');

    expect(firstInitialize).toHaveBeenCalledTimes(1);
    expect(secondInitialize).toHaveBeenCalledTimes(1);
  });

  it('does not route plugins whose initialization fails', async () => {
    const registry = new CorePluginRegistry();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const healthy = plugin({
      id: 'healthy',
      supportedExtensions: ['.good'],
      initialize: vi.fn(),
    });

    registry.register(plugin({
      id: 'broken',
      supportedExtensions: ['.bad'],
      initialize: vi.fn(async () => {
        throw new Error('boom');
      }),
    }));
    registry.register(healthy);

    await registry.initializeAll('/workspace');

    expect(registry.getPluginForFile('src/file.bad')).toBeUndefined();
    expect(registry.getPluginForFile('src/file.good')).toBe(healthy);
    consoleError.mockRestore();
  });

  it('keeps replacement initialization state when the old runtime fails later', async () => {
    const registry = new CorePluginRegistry();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    let rejectOldInitialization!: (error: Error) => void;
    const oldInitialization = new Promise<void>((_resolve, reject) => {
      rejectOldInitialization = reject;
    });
    const replacementInitialize = vi.fn();

    registry.register(plugin({
      id: 'replaceable',
      initialize: () => oldInitialization,
    }));
    const initializingOldRuntime = registry.initializePlugin('replaceable', '/workspace');
    registry.unregister('replaceable');
    registry.register(plugin({
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

  it('unloads registered plugins without letting one failure block later cleanup', () => {
    const registry = new CorePluginRegistry();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const brokenUnload = vi.fn(() => {
      throw new Error('broken cleanup');
    });
    const healthyUnload = vi.fn();

    registry.register(plugin({
      id: 'broken',
      supportedExtensions: ['.bad'],
      onUnload: brokenUnload,
    }));
    registry.register(plugin({
      id: 'healthy',
      supportedExtensions: ['.good'],
      onUnload: healthyUnload,
    }));

    expect(registry.unregister('missing')).toBe(false);
    registry.disposeAll();

    expect(brokenUnload).toHaveBeenCalledOnce();
    expect(healthyUnload).toHaveBeenCalledOnce();
    expect(registry.list()).toEqual([]);
    expect(registry.getPluginForFile('src/file.bad')).toBeUndefined();
    expect(registry.getPluginForFile('src/file.good')).toBeUndefined();
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
    const registry = new CorePluginRegistry();
    registry.register(plugin({
      async analyzeFile(filePath) {
        markAnalysisStarted();
        await analysisGate;
        return { filePath, relations: [] };
      },
      onUnload,
    }));

    const analysis = registry.analyzeFileResult('src/app.test', '', '/workspace');
    await analysisStarted;
    registry.unregister('codegraphy.test');

    expect(registry.get('codegraphy.test')).toBeUndefined();
    expect(onUnload).not.toHaveBeenCalled();

    finishAnalysis();
    await analysis;

    expect(onUnload).toHaveBeenCalledOnce();
  });

  it('lists node and edge type contributions through the registry facade', () => {
    const registry = new CorePluginRegistry();

    registry.register(plugin({
      id: 'contributor',
      contributeNodeTypes: () => [
        { id: 'custom-node', label: 'Custom Node', defaultColor: '#111111', defaultVisible: true },
        { id: 'other-node', label: 'Other Node', defaultColor: '#333333', defaultVisible: false },
      ],
      contributeEdgeTypes: () => [
        { id: 'plugin:custom-edge', label: 'Custom Edge', defaultColor: '#222222', defaultVisible: false },
        { id: 'plugin:other-edge', label: 'Other Edge', defaultColor: '#444444', defaultVisible: true },
      ],
    }));
    registry.register(plugin({ id: 'metadata-only' }));

    expect(registry.listNodeTypes()).toEqual([
      { id: 'custom-node', label: 'Custom Node', defaultColor: '#111111', defaultVisible: true },
      { id: 'other-node', label: 'Other Node', defaultColor: '#333333', defaultVisible: false },
    ]);
    expect(registry.listEdgeTypes()).toEqual([
      { id: 'plugin:custom-edge', label: 'Custom Edge', defaultColor: '#222222', defaultVisible: false },
      { id: 'plugin:other-edge', label: 'Other Edge', defaultColor: '#444444', defaultVisible: true },
    ]);
  });

  it('lists graph scope capabilities contributed by plugins that support workspace files', () => {
    const registry = new CorePluginRegistry();
    const readTypeScriptCapabilities = vi.fn(() =>
      ({
        nodeTypes: ['symbol:function', 'symbol:interface'],
        edgeTypes: ['import', 'codegraphy.typescript:alias-import'],
      }) as const
    );

    registry.register(plugin({
      id: 'typescript',
      supportedExtensions: ['.ts'],
      contributeGraphScopeCapabilities: readTypeScriptCapabilities,
    }));
    registry.register(plugin({
      id: 'godot',
      supportedExtensions: ['.gd'],
      contributeGraphScopeCapabilities: () => ({
        nodeTypes: ['plugin:codegraphy.gdscript:symbol:godot-class-name'],
        edgeTypes: ['load', 'inherit', 'reference'],
      }),
    }));
    registry.register(plugin({
      id: 'wildcard',
      supportedExtensions: ['*'],
      contributeGraphScopeCapabilities: () => ({ edgeTypes: ['reference'] }),
    }));

    expect(registry.listGraphScopeCapabilities(['src/app.ts', 'game/player.gd'])).toEqual({
      nodeTypes: ['symbol:function', 'symbol:interface', 'plugin:codegraphy.gdscript:symbol:godot-class-name'],
      edgeTypes: ['import', 'codegraphy.typescript:alias-import', 'reference', 'load', 'inherit'],
    });
    expect(readTypeScriptCapabilities).toHaveBeenCalledWith({
      filePaths: ['src/app.ts'],
    });
  });

  it('keeps collecting graph scope capabilities after one plugin throws', () => {
    const registry = new CorePluginRegistry();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    registry.register(plugin({
      id: 'broken',
      supportedExtensions: ['.ts'],
      contributeGraphScopeCapabilities: () => {
        throw new Error('broken capabilities');
      },
    }));
    registry.register(plugin({
      id: 'healthy',
      supportedExtensions: ['.ts'],
      contributeGraphScopeCapabilities: () => ({
        nodeTypes: ['symbol:function'],
        edgeTypes: ['call'],
      }),
    }));

    expect(registry.listGraphScopeCapabilities(['src/app.ts'])).toEqual({
      nodeTypes: ['symbol:function'],
      edgeTypes: ['call'],
    });
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
