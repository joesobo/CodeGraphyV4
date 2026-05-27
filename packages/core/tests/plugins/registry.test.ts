import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { describe, expect, it, vi } from 'vitest';

import { CorePluginRegistry } from '../../src';

function plugin(overrides: Partial<IPlugin> = {}): IPlugin {
  return {
    id: 'codegraphy.test',
    name: 'Test',
    version: '1.0.0',
    apiVersion: '2',
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
});
