import { describe, expect, it, vi } from 'vitest';
import type { IProjectedConnection, IFileAnalysisResult, IPlugin } from '@/core/plugins/types/contracts';
import { createConfiguredRegistry, createMockPlugin } from './pluginRegistry.testSupport';

function registerPlugin(overrides: Partial<IPlugin> = {}) {
  const registry = createConfiguredRegistry();
  const plugin = createMockPlugin(overrides);
  registry.register(plugin);
  return { registry, plugin };
}

function createImportConnection(): IProjectedConnection {
  return {
    specifier: './utils',
    resolvedPath: '/src/utils.ts',
    type: 'static',
    sourceId: 'test-source',
    kind: 'import',
  };
}

describe('PluginRegistry analysis', () => {
  it('calls analyzeFile on the appropriate plugin', async () => {
    const { registry, plugin } = registerPlugin({
      supportedExtensions: ['.ts'],
      analyzeFile: vi.fn().mockResolvedValue({
        filePath: '/src/app.ts',
        relations: [{
          kind: 'import',
          sourceId: 'test-source',
          specifier: './utils',
          type: 'static',
          fromFilePath: '/src/app.ts',
          toFilePath: '/src/utils.ts',
        }],
      } satisfies IFileAnalysisResult),
    });

    const result = await registry.analyzeFile('/src/app.ts', 'content', '/workspace');

    expect(plugin.analyzeFile).toHaveBeenCalledWith(
      '/src/app.ts',
      'content',
      '/workspace',
      expect.objectContaining({ mode: 'workspace' }),
    );
    expect(result).toEqual([
      {
        ...createImportConnection(),
        pluginId: 'test.plugin',
        metadata: undefined,
        variant: undefined,
      },
    ]);
  });

  it('returns empty array for unsupported file', async () => {
    const registry = createConfiguredRegistry();

    await expect(registry.analyzeFile('/src/styles.css', 'content', '/workspace')).resolves.toEqual([]);
  });

  it('returns the configured core analysis result for unsupported files', async () => {
    const registry = createConfiguredRegistry();
    const coreAnalyzeFileResult = vi.fn().mockResolvedValue({
      filePath: '/src/styles.css',
      relations: [
        {
          kind: 'reference',
          pluginId: undefined,
          sourceId: 'codegraphy.core.tree-sitter',
          fromFilePath: '/src/styles.css',
          toFilePath: '/src/theme.css',
          specifier: './theme.css',
        },
      ],
    } satisfies IFileAnalysisResult);
    registry.setCoreAnalyzeFileResult(coreAnalyzeFileResult);

    const result = await registry.analyzeFileResult('/src/styles.css', 'content', '/workspace');

    expect(coreAnalyzeFileResult).toHaveBeenCalledWith('/src/styles.css', 'content', '/workspace');
    expect(result).toEqual({
      filePath: '/src/styles.css',
      edgeTypes: [],
      nodeTypes: [],
      nodes: [],
      relations: [
        {
          kind: 'reference',
          pluginId: undefined,
          sourceId: 'codegraphy.core.tree-sitter',
          fromFilePath: '/src/styles.css',
          toFilePath: '/src/theme.css',
          specifier: './theme.css',
        },
      ],
      symbols: [],
    });
  });

  it('returns empty array on plugin error', async () => {
    const { registry } = registerPlugin({
      supportedExtensions: ['.ts'],
      analyzeFile: vi.fn().mockRejectedValue(new Error('Parse error')),
    });

    const result = await registry.analyzeFile('/src/app.ts', 'content', '/workspace');

    expect(result).toEqual([]);
  });

  it('uses analyzeFile results directly', async () => {
    const fileResult: IFileAnalysisResult = {
      filePath: '/src/app.ts',
      relations: [
        {
          kind: 'import',
          pluginId: 'test.plugin',
          sourceId: 'typescript:es6-import',
          fromFilePath: '/src/app.ts',
          toFilePath: '/src/utils.ts',
          specifier: './utils',
        },
      ],
    };
    const { registry, plugin } = registerPlugin({
      supportedExtensions: ['.ts'],
      analyzeFile: vi.fn().mockResolvedValue(fileResult),
    });

    const result = await registry.analyzeFileResult('/src/app.ts', 'content', '/workspace');

    expect(plugin.analyzeFile).toHaveBeenCalledWith(
      '/src/app.ts',
      'content',
      '/workspace',
      expect.objectContaining({ mode: 'workspace' }),
    );
    expect(result).toEqual({
      edgeTypes: [],
      filePath: '/src/app.ts',
      nodeTypes: [],
      nodes: [],
      relations: fileResult.relations,
      symbols: [],
    });
  });

  it('merges all matching plugins and lets higher-priority plugins override conflicts', async () => {
    const registry = createConfiguredRegistry();

    registry.register(createMockPlugin({
      id: 'plugin.high',
      supportedExtensions: ['.ts'],
      analyzeFile: vi.fn().mockResolvedValue({
        filePath: '/src/app.ts',
        relations: [
          {
            kind: 'import',
            pluginId: 'plugin.high',
            sourceId: 'shared:import',
            fromFilePath: '/src/app.ts',
            toFilePath: '/src/high.ts',
            specifier: './utils',
          },
        ],
      }),
    }));

    registry.register(createMockPlugin({
      id: 'plugin.low',
      supportedExtensions: ['.ts'],
      analyzeFile: vi.fn().mockResolvedValue({
        filePath: '/src/app.ts',
        relations: [
          {
            kind: 'import',
            pluginId: 'plugin.low',
            sourceId: 'shared:import',
            fromFilePath: '/src/app.ts',
            toFilePath: '/src/low.ts',
            specifier: './utils',
          },
        ],
      }),
    }));

    const result = await registry.analyzeFileResult('/src/app.ts', 'content', '/workspace');

    expect(result).toEqual({
      filePath: '/src/app.ts',
      edgeTypes: [],
      nodeTypes: [],
      nodes: [],
      relations: [
        {
          kind: 'import',
          pluginId: 'plugin.high',
          sourceId: 'shared:import',
          fromFilePath: '/src/app.ts',
          toFilePath: '/src/high.ts',
          specifier: './utils',
        },
      ],
      symbols: [],
    });
  });

  it('merges plugin analysis on top of the configured core result', async () => {
    const registry = createConfiguredRegistry();
    registry.setCoreAnalyzeFileResult(vi.fn().mockResolvedValue({
      filePath: '/src/app.ts',
      relations: [
        {
          kind: 'import',
          pluginId: undefined,
          sourceId: 'shared:import',
          fromFilePath: '/src/app.ts',
          toFilePath: '/src/core.ts',
          specifier: './shared',
        },
      ],
    } satisfies IFileAnalysisResult));
    registry.register(createMockPlugin({
      supportedExtensions: ['.ts'],
      analyzeFile: vi.fn().mockResolvedValue({
        filePath: '/src/app.ts',
        relations: [
          {
            kind: 'import',
            pluginId: 'test.plugin',
            sourceId: 'shared:import',
            fromFilePath: '/src/app.ts',
            toFilePath: '/src/plugin.ts',
            specifier: './shared',
          },
        ],
      }),
    }));

    const result = await registry.analyzeFileResult('/src/app.ts', 'content', '/workspace');

    expect(result).toEqual({
      filePath: '/src/app.ts',
      edgeTypes: [],
      nodeTypes: [],
      nodes: [],
      relations: [
        {
          kind: 'import',
          pluginId: 'test.plugin',
          sourceId: 'shared:import',
          fromFilePath: '/src/app.ts',
          toFilePath: '/src/plugin.ts',
          specifier: './shared',
        },
      ],
      symbols: [],
    });
  });

  it('preserves distinct relations when they resolve to different target symbols', async () => {
    const registry = createConfiguredRegistry();
    registry.register(createMockPlugin({
      supportedExtensions: ['.ts'],
      analyzeFile: vi.fn().mockResolvedValue({
        filePath: '/src/app.ts',
        relations: [
          {
            kind: 'call',
            pluginId: 'test.plugin',
            sourceId: 'shared:call',
            fromFilePath: '/src/app.ts',
            fromSymbolId: '/src/app.ts:function:run',
            toFilePath: '/src/lib-a.ts',
            toSymbolId: '/src/lib-a.ts:function:boot',
            specifier: './lib',
          },
          {
            kind: 'call',
            pluginId: 'test.plugin',
            sourceId: 'shared:call',
            fromFilePath: '/src/app.ts',
            fromSymbolId: '/src/app.ts:function:run',
            toFilePath: '/src/lib-b.ts',
            toSymbolId: '/src/lib-b.ts:function:boot',
            specifier: './lib',
          },
        ],
      }),
    }));

    const result = await registry.analyzeFileResult('/src/app.ts', 'content', '/workspace');

    expect(result?.relations).toEqual([
      {
        kind: 'call',
        pluginId: 'test.plugin',
        sourceId: 'shared:call',
        fromFilePath: '/src/app.ts',
        fromSymbolId: '/src/app.ts:function:run',
        toFilePath: '/src/lib-a.ts',
        toSymbolId: '/src/lib-a.ts:function:boot',
        specifier: './lib',
      },
      {
        kind: 'call',
        pluginId: 'test.plugin',
        sourceId: 'shared:call',
        fromFilePath: '/src/app.ts',
        fromSymbolId: '/src/app.ts:function:run',
        toFilePath: '/src/lib-b.ts',
        toSymbolId: '/src/lib-b.ts:function:boot',
        specifier: './lib',
      },
    ]);
  });
});
