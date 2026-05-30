import { describe, expect, it, vi } from 'vitest';
import {
  analyzeFile,
  analyzeFileResult,
} from '../../../src/core/plugins/routing/router/analyze';
import type { IPlugin } from '../../../src/core/plugins/types/contracts';

function makePlugin(id: string, extensions: string[]): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: extensions,
    analyzeFile: vi.fn(async (filePath: string) => ({
      filePath,
      relations: [],
    })),
  } as IPlugin;
}

function buildMaps(
  plugins: IPlugin[],
): {
  pluginsMap: Map<string, { plugin: IPlugin }>;
  extensionMap: Map<string, string[]>;
} {
  const pluginsMap = new Map<string, { plugin: IPlugin }>();
  const extensionMap = new Map<string, string[]>();

  for (const plugin of plugins) {
    pluginsMap.set(plugin.id, { plugin });
    for (const ext of plugin.supportedExtensions) {
      const normalized = ext.startsWith('.') ? ext : `.${ext}`;
      const ids = extensionMap.get(normalized) ?? [];
      ids.push(plugin.id);
      extensionMap.set(normalized, ids);
    }
  }

  return { pluginsMap, extensionMap };
}

describe('plugin routing', () => {
  describe('analyzeFile', () => {

        it('delegates to the matching plugin and returns connections', async () => {
          const ts = makePlugin('ts-plugin', ['.ts']);
          (ts.analyzeFile as ReturnType<typeof vi.fn>).mockResolvedValue({
            filePath: 'src/app.ts',
            relations: [{
              edgeType: 'import',
              sourceId: 'ts:import',
              from: { kind: 'file', filePath: 'src/app.ts' },
              target: { kind: 'file', path: '/ws/src/b.ts', pathKind: 'absolute', specifier: './b' },
            }],
          });
          const { pluginsMap, extensionMap } = buildMaps([ts]);

          const result = await analyzeFile('src/app.ts', 'content', '/ws', pluginsMap, extensionMap);

          expect(result).toEqual([
            {
              kind: 'import',
              pluginId: 'ts-plugin',
              sourceId: 'ts:import',
              specifier: './b',
              resolvedPath: '/ws/src/b.ts',
              type: undefined,
              variant: undefined,
              metadata: undefined,
            },
          ]);
        });



        it('returns empty array when no plugin supports the file', async () => {
          const { pluginsMap, extensionMap } = buildMaps([]);

          const result = await analyzeFile('src/app.ts', 'content', '/ws', pluginsMap, extensionMap);

          expect(result).toEqual([]);
        });



        it('returns core analysis output when no plugin supports the file but core does', async () => {
          const { pluginsMap, extensionMap } = buildMaps([]);
          const coreAnalyzeFileResult = vi.fn().mockResolvedValue({
            filePath: 'src/app.ts',
            relations: [{
              edgeType: 'reference',
              sourceId: 'codegraphy.core.tree-sitter',
              from: { kind: 'file', filePath: 'src/app.ts' },
              target: { kind: 'file', path: 'src/base.ts', pathKind: 'workspace-relative', specifier: './base' },
            }],
          });

          const result = await analyzeFile(
            'src/app.ts',
            'content',
            '/ws',
            pluginsMap,
            extensionMap,
            coreAnalyzeFileResult,
          );

          expect(coreAnalyzeFileResult).toHaveBeenCalledWith('src/app.ts', 'content', '/ws');
          expect(result).toEqual([{
            kind: 'reference',
            pluginId: undefined,
            sourceId: 'codegraphy.core.tree-sitter',
            specifier: './base',
            resolvedPath: '/ws/src/base.ts',
            type: undefined,
            variant: undefined,
            metadata: undefined,
          }]);
        });



        it('returns empty array and logs when the plugin throws', async () => {
          const ts = makePlugin('ts-plugin', ['.ts']);
          (ts.analyzeFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));
          const { pluginsMap, extensionMap } = buildMaps([ts]);

          const result = await analyzeFile('src/app.ts', 'content', '/ws', pluginsMap, extensionMap);

          expect(result).toEqual([]);
        });



        it('merges matching plugins bottom-to-top so earlier plugins in the list win conflicts', async () => {
          const highPriority = makePlugin('high-priority', ['.ts']);
          highPriority.analyzeFile = vi.fn().mockResolvedValue({
            filePath: 'src/app.ts',
            relations: [{
              edgeType: 'import',
              sourceId: 'shared:import',
              from: { kind: 'file', filePath: 'src/app.ts' },
              target: { kind: 'file', path: 'src/high.ts', pathKind: 'workspace-relative', specifier: './high' },
            }],
          });

          const lowPriority = makePlugin('low-priority', ['.ts']);
          lowPriority.analyzeFile = vi.fn().mockResolvedValue({
            filePath: 'src/app.ts',
            relations: [{
              edgeType: 'import',
              sourceId: 'shared:import',
              from: { kind: 'file', filePath: 'src/app.ts' },
              target: { kind: 'file', path: 'src/low.ts', pathKind: 'workspace-relative', specifier: './high' },
            }],
          });

          const { pluginsMap, extensionMap } = buildMaps([highPriority, lowPriority]);

          const result = await analyzeFileResult('src/app.ts', 'content', '/ws', pluginsMap, extensionMap);

          expect(
            (lowPriority.analyzeFile as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
          ).toBeLessThan(
            (highPriority.analyzeFile as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
          );
          expect(result?.relations).toEqual([{
            edgeType: 'import',
            pluginId: 'high-priority',
            sourceId: 'shared:import',
            from: { kind: 'file', filePath: 'src/app.ts' },
            target: { kind: 'file', path: 'src/high.ts', pathKind: 'workspace-relative', specifier: './high' },
          }]);
        });



        it('merges plugin output on top of core analysis so plugins can override the base relation', async () => {
          const plugin = makePlugin('plugin', ['.ts']);
          plugin.analyzeFile = vi.fn().mockResolvedValue({
            filePath: 'src/app.ts',
            relations: [{
              edgeType: 'import',
              sourceId: 'shared:import',
              from: { kind: 'file', filePath: 'src/app.ts' },
              target: { kind: 'file', path: 'src/plugin.ts', pathKind: 'workspace-relative', specifier: './shared' },
            }],
          });
          const { pluginsMap, extensionMap } = buildMaps([plugin]);
          const coreAnalyzeFileResult = vi.fn().mockResolvedValue({
            filePath: 'src/app.ts',
            relations: [{
              edgeType: 'import',
              sourceId: 'shared:import',
              from: { kind: 'file', filePath: 'src/app.ts' },
              target: { kind: 'file', path: 'src/core.ts', pathKind: 'workspace-relative', specifier: './shared' },
            }],
          });

          const result = await analyzeFileResult(
            'src/app.ts',
            'content',
            '/ws',
            pluginsMap,
            extensionMap,
            coreAnalyzeFileResult,
          );

          expect(result?.relations).toEqual([{
            edgeType: 'import',
            pluginId: 'plugin',
            sourceId: 'shared:import',
            from: { kind: 'file', filePath: 'src/app.ts' },
            target: { kind: 'file', path: 'src/plugin.ts', pathKind: 'workspace-relative', specifier: './shared' },
          }]);
        });



        it('keeps distinct same-kind relations when they point at different targets', async () => {
          const plugin = makePlugin('plugin', ['.ts']);
          plugin.analyzeFile = vi.fn().mockResolvedValue({
            filePath: 'src/app.ts',
            relations: [
              {
                edgeType: 'call',
                sourceId: 'shared:call',
                from: { kind: 'symbol', symbolId: 'src/app.ts:function:run', filePath: 'src/app.ts' },
                target: { kind: 'symbol', symbolId: 'src/lib-a.ts:function:boot', filePath: 'src/lib-a.ts', specifier: './lib' },
              },
              {
                edgeType: 'call',
                sourceId: 'shared:call',
                from: { kind: 'symbol', symbolId: 'src/app.ts:function:run', filePath: 'src/app.ts' },
                target: { kind: 'symbol', symbolId: 'src/lib-b.ts:function:boot', filePath: 'src/lib-b.ts', specifier: './lib' },
              },
            ],
          });
          const { pluginsMap, extensionMap } = buildMaps([plugin]);

          const result = await analyzeFileResult(
            'src/app.ts',
            'content',
            '/ws',
            pluginsMap,
            extensionMap,
          );

          expect(result?.relations).toEqual([
            {
              edgeType: 'call',
              pluginId: 'plugin',
              sourceId: 'shared:call',
              from: { kind: 'symbol', symbolId: 'src/app.ts:function:run', filePath: 'src/app.ts' },
              target: { kind: 'symbol', symbolId: 'src/lib-a.ts:function:boot', filePath: 'src/lib-a.ts', specifier: './lib' },
            },
            {
              edgeType: 'call',
              pluginId: 'plugin',
              sourceId: 'shared:call',
              from: { kind: 'symbol', symbolId: 'src/app.ts:function:run', filePath: 'src/app.ts' },
              target: { kind: 'symbol', symbolId: 'src/lib-b.ts:function:boot', filePath: 'src/lib-b.ts', specifier: './lib' },
            },
          ]);
        });
  });
});
