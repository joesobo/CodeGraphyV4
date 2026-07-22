import { describe, expect, it, vi, beforeEach } from 'vitest';
vi.mock('../../../../src/extension/pipeline/service/runtime/discovery', () => ({
  createWorkspacePipelineDiscoveryDependencies: vi.fn(),
  discoverWorkspacePipelineFilesWithWarnings: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/bootstrap', () => ({
  initializeWorkspacePipeline: vi.fn(),
  syncWorkspacePipelinePlugins: vi.fn(),
  getWorkspacePipelinePluginFilterPatterns: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/service/cache/index', () => ({
  hasWorkspacePipelineIndex: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/service/runtime/run', () => ({
  analyzeWorkspacePipeline: vi.fn(),
  rebuildWorkspacePipelineGraph: vi.fn(),
}));

const childProcessMock = vi.hoisted(() => ({
  spawnSync: vi.fn(() => ({ error: undefined, status: 1, stdout: '' })),
}));

vi.mock('node:child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:child_process')>();
  return {
    ...original,
    spawnSync: childProcessMock.spawnSync,
    default: {
      ...original,
      spawnSync: childProcessMock.spawnSync,
    },
  };
});

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn(),
      inspect: vi.fn(),
    })),
    createFileSystemWatcher: vi.fn(),
    onDidSaveTextDocument: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
  },
  window: {
    showWarningMessage: vi.fn(),
  },
}));

import {
  createDeferred,
  type FileDiscovery,
  type PluginRegistry,
  TestDiscoveryFacade,
  setUpDiscoveryFacade,
} from './discoveryFacadeFixture';

describe('pipeline/service/discoveryFacade warm analysis', () => {
  beforeEach(setUpDiscoveryFacade);

  it('warms one cached source file through the routed analyzer after cached replay', async () => {
    const facade = new TestDiscoveryFacade();
    const warmContent = createDeferred<string>();
    const analyzeFileResultForPlugins = vi.fn(async () => ({
      filePath: '/workspace/src/nested/cached.ts',
      relations: [],
    }));
    facade._discovery = {
      readContent: vi.fn(() => warmContent.promise),
    } as unknown as FileDiscovery;
    facade._registry = {
      analyzeFileResultForPlugins,
      list: vi.fn(() => [{ plugin: { id: 'plugin.typescript' } }]),
      supportsFile: vi.fn(() => true),
    } as unknown as PluginRegistry;
    facade._cache = {
      version: 'test',
      files: {
        'docs/readme.md': {
          mtime: 1,
          analysis: {
            filePath: '/workspace/docs/readme.md',
            relations: [],
          },
        },
        '.stryker-tmp/sandbox/src/mutant.ts': {
          mtime: 1,
          analysis: {
            filePath: '/workspace/.stryker-tmp/sandbox/src/mutant.ts',
            relations: [],
          },
        },
        'src/nested/cached.ts': {
          mtime: 1,
          analysis: {
            filePath: '/workspace/src/nested/cached.ts',
            relations: [],
          },
        },
        'src/nested/next.ts': {
          mtime: 1,
          analysis: {
            filePath: '/workspace/src/nested/next.ts',
            relations: [],
          },
        },
      },
    } as never;
    vi.spyOn(
      facade as unknown as {
        _buildGraphDataFromAnalysis: (...args: unknown[]) => unknown;
      },
      '_buildGraphDataFromAnalysis',
    ).mockReturnValue({
      nodes: [{ id: 'src/nested/cached.ts', label: 'cached.ts', color: '#333333' }],
      edges: [],
    });

    await expect(facade.loadCachedGraph()).resolves.toEqual({
      nodes: [{ id: 'src/nested/cached.ts', label: 'cached.ts', color: '#333333' }],
      edges: [],
    });

    expect(facade._discovery.readContent).toHaveBeenCalledWith({
      absolutePath: '/workspace/src/nested/cached.ts',
      extension: '.ts',
      name: 'cached.ts',
      relativePath: 'src/nested/cached.ts',
    });
    expect(analyzeFileResultForPlugins).not.toHaveBeenCalled();

    warmContent.resolve('export const cached = 1;\n');
    await vi.waitFor(() => expect(analyzeFileResultForPlugins).toHaveBeenCalledOnce());
    expect(analyzeFileResultForPlugins).toHaveBeenCalledWith(
      '/workspace/src/nested/cached.ts',
      'export const cached = 1;\n',
      '/workspace',
      ['plugin.typescript'],
      expect.objectContaining({
        features: expect.objectContaining({ symbols: true }),
      }),
      { disabledPlugins: new Set<string>() },
    );
  });

  it('does not warm cached source analysis when cached replay disables warm-up', async () => {
    const facade = new TestDiscoveryFacade();
    const analyzeFileResultForPlugins = vi.fn();
    facade._discovery = {
      readContent: vi.fn(async () => 'export const cached = 1;\n'),
    } as unknown as FileDiscovery;
    facade._registry = {
      analyzeFileResultForPlugins,
      list: vi.fn(() => [{ plugin: { id: 'plugin.typescript' } }]),
      supportsFile: vi.fn(() => true),
    } as unknown as PluginRegistry;
    facade._cache = {
      version: 'test',
      files: {
        'src/nested/cached.ts': {
          mtime: 1,
          analysis: {
            filePath: '/workspace/src/nested/cached.ts',
            relations: [],
          },
        },
      },
    } as never;
    vi.spyOn(
      facade as unknown as {
        _buildGraphDataFromAnalysis: (...args: unknown[]) => unknown;
      },
      '_buildGraphDataFromAnalysis',
    ).mockReturnValue({
      nodes: [{ id: 'src/nested/cached.ts', label: 'cached.ts', color: '#333333' }],
      edges: [],
    });

    await expect(facade.loadCachedGraph([], new Set(), undefined, {
      warmAnalysis: false,
    })).resolves.toEqual({
      nodes: [{ id: 'src/nested/cached.ts', label: 'cached.ts', color: '#333333' }],
      edges: [],
    });

    expect(facade._discovery.readContent).not.toHaveBeenCalled();
    expect(analyzeFileResultForPlugins).not.toHaveBeenCalled();
  });

  it('skips cached analysis warm-up quietly when the selected file disappeared', async () => {
    const facade = new TestDiscoveryFacade();
    const readError = Object.assign(new Error('missing cached file'), { code: 'ENOENT' });
    const analyzeFileResultForPlugins = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    facade._discovery = {
      readContent: vi.fn(async () => {
        throw readError;
      }),
    } as unknown as FileDiscovery;
    facade._registry = {
      analyzeFileResultForPlugins,
      list: vi.fn(() => [{ plugin: { id: 'plugin.typescript' } }]),
      supportsFile: vi.fn(() => true),
    } as unknown as PluginRegistry;
    facade._cache = {
      version: 'test',
      files: {
        'src/gone.ts': {
          mtime: 1,
          analysis: {
            filePath: '/workspace/src/gone.ts',
            relations: [],
          },
        },
      },
    } as never;
    vi.spyOn(
      facade as unknown as {
        _buildGraphDataFromAnalysis: (...args: unknown[]) => unknown;
      },
      '_buildGraphDataFromAnalysis',
    ).mockReturnValue({
      nodes: [{ id: 'src/gone.ts', label: 'gone.ts', color: '#333333' }],
      edges: [],
    });

    await facade.loadCachedGraph();

    await vi.waitFor(() => expect(facade._discovery.readContent).toHaveBeenCalledOnce());
    expect(analyzeFileResultForPlugins).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
