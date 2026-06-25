import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  analyzeWorkspacePipelineFiles,
  buildWorkspacePipelineGraphData,
  buildWorkspacePipelineGraphDataFromAnalysis,
  preAnalyzeWorkspacePipelinePlugins,
  readWorkspacePipelineFileStat,
  readWorkspacePipelineRoot,
} from '../../../src/extension/pipeline/serviceAdapters';
import { CACHE_VERSION } from '../../../src/extension/gitHistory/cache/stateKeys';

describe('pipeline/serviceAdapters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pre-analyzes files with shared registry and discovery adapters', async () => {
    const notifyPreAnalyze = vi.fn(async () => undefined);
    const readContent = vi.fn(async () => 'content');

    await preAnalyzeWorkspacePipelinePlugins(
      [{ absolutePath: '/workspace/src/app.ts', relativePath: 'src/app.ts' } as never],
      '/workspace',
      { notifyPreAnalyze } as never,
      { readContent } as never,
    );

    expect(notifyPreAnalyze).toHaveBeenCalledOnce();
    expect(readContent).toHaveBeenCalledWith({
      absolutePath: '/workspace/src/app.ts',
      relativePath: 'src/app.ts',
    });
  });

  it('analyzes files, builds graphs, and reads workspace io through the extracted helpers', async () => {
    const cache = { files: {} };
    const stat = { mtime: 5, size: 12 };
    const fileSystem = { stat: vi.fn(async () => ({ mtime: 5, size: 12 })) };
    const discovery = {
      readContent: vi.fn(async () => 'content'),
      readAsString: vi.fn(async () => 'content'),
      readAsBytes: vi.fn(async () => new Uint8Array()),
    };
    const registry = {
      notifyPreAnalyze: vi.fn(async () => undefined),
      analyzeFileResult: vi.fn(async () => ({
        filePath: '/workspace/src/app.ts',
        relations: [
          {
            kind: 'import',
            sourceId: 'test-source',
            specifier: './lib',
            resolvedPath: '/workspace/src/lib.ts',
            fromFilePath: '/workspace/src/app.ts',
            toFilePath: '/workspace/src/lib.ts',
          },
        ],
      })),
    };

    const analysisResult = await analyzeWorkspacePipelineFiles(
      cache as never,
      discovery as never,
      undefined,
      registry as never,
      vi.fn(async () => stat),
      [{ absolutePath: '/workspace/src/app.ts', relativePath: 'src/app.ts' } as never],
      '/workspace',
    );

    expect(Array.from(analysisResult.fileConnections.values())[0]).toEqual([
      {
        kind: 'import',
        sourceId: 'test-source',
        specifier: './lib',
        resolvedPath: '/workspace/src/lib.ts',
      },
    ]);
    expect(analysisResult.fileAnalysis.get('src/app.ts')).toEqual({
      filePath: '/workspace/src/app.ts',
      relations: [
        {
          kind: 'import',
          sourceId: 'test-source',
          specifier: './lib',
          resolvedPath: '/workspace/src/lib.ts',
          fromFilePath: '/workspace/src/app.ts',
          toFilePath: '/workspace/src/lib.ts',
        },
      ],
    });
    expect(registry.notifyPreAnalyze).toHaveBeenCalledOnce();

    const graphData = buildWorkspacePipelineGraphData(
      cache as never,
      { workspaceState: { get: vi.fn(() => undefined), update: vi.fn() } } as never,
      {
        getNodeDecorations: vi.fn(() => ({})),
        getAllPlugins: vi.fn(() => []),
        getPluginForFile: vi.fn(() => undefined),
        list: vi.fn(() => []),
      } as never,
      analysisResult.fileConnections,
      '/workspace',
      true,
    );

    expect(graphData.nodes).toEqual([
      expect.objectContaining({ id: 'src/app.ts', label: 'app.ts' }),
    ]);
    expect(graphData.edges).toEqual([]);

    expect(readWorkspacePipelineRoot([{ uri: { fsPath: '/workspace' } }] as never)).toBe('/workspace');
    await expect(readWorkspacePipelineFileStat('/workspace/src/app.ts', fileSystem as never)).resolves.toEqual(stat);
  });

  it('builds graph nodes with valid cached git history churn counts', () => {
    const cache = {
      files: {
        'src/app.ts': { size: 12 },
      },
    };
    const workspaceState = {
      get: vi.fn(<T>(key: string): T | undefined => {
        const values: Record<string, unknown> = {
          'codegraphy.timelineCacheVersion': CACHE_VERSION,
          'codegraphy.timelinePluginSignature': 'a.plugin@1.0.0|z.plugin@2.0.0',
          'codegraphy.timelineChurnCounts': { 'src/app.ts': 5 },
        };

        return values[key] as T | undefined;
      }),
      update: vi.fn(),
    };
    const registry = {
      getPluginForFile: vi.fn(() => undefined),
      list: vi.fn(() => [
        { plugin: { id: 'z.plugin', version: '2.0.0' } },
        { plugin: { id: 'a.plugin', version: '1.0.0' } },
      ]),
    };

    const graphData = buildWorkspacePipelineGraphData(
      cache as never,
      { workspaceState } as never,
      registry as never,
      new Map([['src/app.ts', []]]),
      '/workspace',
      true,
    );

    expect(graphData.nodes).toEqual([
      expect.objectContaining({ id: 'src/app.ts', churn: 5 }),
    ]);
  });

  it('builds symbol-capable graph data from cached file analysis', () => {
    const cache = {
      files: {
        'src/player.gd': { size: 20 },
      },
    };
    const workspaceState = {
      get: vi.fn(() => undefined),
      update: vi.fn(),
    };
    const registry = {
      getPluginForFile: vi.fn(() => undefined),
      list: vi.fn(() => []),
    };

    const graphData = buildWorkspacePipelineGraphDataFromAnalysis(
      cache as never,
      { workspaceState } as never,
      registry as never,
      new Map([
        ['src/player.gd', {
          filePath: '/workspace/src/player.gd',
          symbols: [{
            id: '/workspace/src/player.gd:method:_ready',
            filePath: '/workspace/src/player.gd',
            kind: 'method',
            name: '_ready',
          }],
          relations: [],
        }],
      ]),
      '/workspace',
      true,
      new Set(),
      [],
      { nodeVisibility: { symbol: true, 'symbol:function': true } },
    );

    expect(graphData.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'src/player.gd#_ready:method', nodeType: 'symbol' }),
    ]));
    expect(graphData.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        from: 'src/player.gd',
        kind: 'contains',
        to: 'src/player.gd#_ready:method',
      }),
    ]));
  });

  it('keeps cached symbols out of the Graph View payload when symbols are scoped off', () => {
    const cache = {
      files: {
        'src/player.gd': { size: 20 },
      },
    };
    const workspaceState = {
      get: vi.fn(() => undefined),
      update: vi.fn(),
    };
    const registry = {
      getPluginForFile: vi.fn(() => undefined),
      list: vi.fn(() => []),
    };

    const graphData = buildWorkspacePipelineGraphDataFromAnalysis(
      cache as never,
      { workspaceState } as never,
      registry as never,
      new Map([
        ['src/player.gd', {
          filePath: '/workspace/src/player.gd',
          symbols: [{
            id: '/workspace/src/player.gd:method:_ready',
            filePath: '/workspace/src/player.gd',
            kind: 'method',
            name: '_ready',
          }],
          relations: [],
        }],
      ]),
      '/workspace',
      true,
      new Set(),
      [],
      { nodeVisibility: { symbol: false } },
    );

    expect(graphData.nodes).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'src/player.gd#_ready:method' }),
    ]));
    expect(graphData.edges).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'contains' }),
    ]));
  });

  it('hides cached relations owned by plugins that are no longer registered', () => {
    const cache = {
      files: {
        'src/app.ts': { size: 12 },
        'src/organize.ts': { size: 8 },
      },
    };
    const workspaceState = {
      get: vi.fn(() => undefined),
      update: vi.fn(),
    };
    const registry = {
      getPluginForFile: vi.fn(() => undefined),
      list: vi.fn(() => []),
    };

    const graphData = buildWorkspacePipelineGraphData(
      cache as never,
      { workspaceState } as never,
      registry as never,
      new Map([
        ['src/app.ts', [
          {
            kind: 'import',
            pluginId: 'codegraphy.organize',
            sourceId: 'organize-edge',
            specifier: './organize',
            resolvedPath: '/workspace/src/organize.ts',
          },
        ]],
        ['src/organize.ts', []],
      ]),
      '/workspace',
      true,
    );

    expect(graphData.edges).toEqual([]);
  });

  it('hides cached symbols owned by plugins that are no longer registered', () => {
    const cache = {
      files: {
        'src/app.ts': { size: 12 },
      },
    };
    const workspaceState = {
      get: vi.fn(() => undefined),
      update: vi.fn(),
    };
    const registry = {
      getPluginForFile: vi.fn(() => undefined),
      list: vi.fn(() => []),
    };

    const graphData = buildWorkspacePipelineGraphDataFromAnalysis(
      cache as never,
      { workspaceState } as never,
      registry as never,
      new Map([
        ['src/app.ts', {
          filePath: '/workspace/src/app.ts',
          symbols: [{
            id: '/workspace/src/app.ts:function:run',
            filePath: '/workspace/src/app.ts',
            kind: 'function',
            name: 'run',
            metadata: {
              pluginId: 'codegraphy.organize',
              source: 'codegraphy.organize',
            },
          }],
          relations: [],
        }],
      ]),
      '/workspace',
      true,
      new Set(),
      [],
      { nodeVisibility: { symbol: true, 'symbol:function': true } },
    );

    expect(graphData.nodes).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'src/app.ts#run:function' }),
    ]));
  });
});
