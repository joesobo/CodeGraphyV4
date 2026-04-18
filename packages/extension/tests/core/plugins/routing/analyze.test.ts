import { describe, expect, it, vi } from 'vitest';
import type { IPlugin } from '../../../../src/core/plugins/types/contracts';
import { analyzeFile, analyzeFileResult } from '../../../../src/core/plugins/routing/router/analyze';

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

function makePlugin(id: string, extensions: string[], result: object): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: extensions,
    analyzeFile: vi.fn().mockResolvedValue(result),
  } as IPlugin;
}

describe('routing/analyze', () => {
  it('projects analyzed file results into graph connections', async () => {
    const active = makePlugin('active', ['.ts'], {
      filePath: 'src/app.ts',
      symbols: [{
        id: 'symbol:src/app.ts:boot',
        name: 'boot',
        kind: 'function',
        filePath: 'src/app.ts',
      }],
      relations: [{
        kind: 'import',
        sourceId: 'plugin:import',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/lib.ts',
      }],
    });
    const { pluginsMap, extensionMap } = buildMaps([active]);

    const result = await analyzeFile(
      'src/app.ts',
      'content',
      '/ws',
      pluginsMap,
      extensionMap,
    );

    expect(result).toEqual([
      {
        kind: 'import',
        pluginId: 'active',
        sourceId: 'plugin:import',
        specifier: '',
        resolvedPath: 'src/lib.ts',
        type: undefined,
        variant: undefined,
        metadata: undefined,
      },
    ]);
  });

  it('returns an empty connection list when no plugin or core analysis produces a result', async () => {
    expect(
      await analyzeFile(
        'src/app.ts',
        'content',
        '/ws',
        new Map(),
        new Map(),
      ),
    ).toEqual([]);
  });

  it('returns null when no plugins match and core analysis is unavailable', async () => {
    expect(
      await analyzeFileResult(
        'src/app.ts',
        'content',
        '/ws',
        new Map(),
        new Map(),
      ),
    ).toBeNull();
  });

  it('returns normalized core results when matching plugins do not analyze files', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const passive = {
      id: 'passive',
      name: 'passive',
      version: '1.0.0',
      apiVersion: '^2.0.0',
      supportedExtensions: ['.ts'],
    } as IPlugin;
    const { pluginsMap, extensionMap } = buildMaps([passive]);
    const coreAnalyzeFileResult = vi.fn().mockResolvedValue({
      filePath: '',
      relations: [{
        kind: 'reference',
        sourceId: 'core:reference',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/base.ts',
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

    expect(result).toEqual({
      filePath: 'src/app.ts',
      edgeTypes: [],
      nodeTypes: [],
      nodes: [],
      relations: [{
        kind: 'reference',
        sourceId: 'core:reference',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/base.ts',
      }],
      symbols: [],
    });
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('continues merging after a plugin failure', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failing = {
      id: 'failing',
      name: 'failing',
      version: '1.0.0',
      apiVersion: '^2.0.0',
      supportedExtensions: ['.ts'],
      analyzeFile: vi.fn().mockRejectedValue(new Error('boom')),
    } as IPlugin;
    const succeeding = makePlugin('succeeding', ['.ts'], {
      filePath: 'src/app.ts',
      relations: [{
        kind: 'import',
        sourceId: 'plugin:import',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/lib.ts',
      }],
    });
    const { pluginsMap, extensionMap } = buildMaps([failing, succeeding]);

    const result = await analyzeFileResult('src/app.ts', 'content', '/ws', pluginsMap, extensionMap);

    expect(result?.relations).toEqual([{
      kind: 'import',
      pluginId: 'succeeding',
      sourceId: 'plugin:import',
      fromFilePath: 'src/app.ts',
      toFilePath: 'src/lib.ts',
    }]);
    expect(consoleError).toHaveBeenCalledWith(
      '[CodeGraphy] Error analyzing src/app.ts with failing:',
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});
