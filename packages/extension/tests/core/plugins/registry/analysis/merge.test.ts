import { describe, expect, it, vi } from 'vitest';
import type { IFileAnalysisResult } from '@/core/plugins/types/contracts';
import { createConfiguredRegistry, createMockPlugin } from '../pluginRegistry.testSupport';

describe('PluginRegistry analysis merging', () => {
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
