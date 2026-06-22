import type { IFileAnalysisResult, IPlugin } from '@codegraphy-dev/plugin-api';
import { describe, expect, it, vi } from 'vitest';
import {
  analyzeFileResult,
  CorePluginRegistry,
  getPluginsForExtension,
  toProjectedConnectionsFromFileAnalysis,
  withPluginProvenance,
} from '../../src';
import {
  getPluginForFile,
  getPluginInfosForFile,
  getPluginsForFile,
  getSupportedExtensions,
  supportsFile,
  type IRoutablePluginInfo,
} from '../../src/plugins/routing/router/lookups';
import { getRelationKey } from '../../src/plugins/routing/router/results/keys';

type Relation = NonNullable<IFileAnalysisResult['relations']>[number];

function plugin(id: string, extensions: string[], analyzeFile?: IPlugin['analyzeFile']): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '2',
    supportedExtensions: extensions,
    analyzeFile,
  };
}

function relation(overrides: Partial<Relation>): Relation {
  return {
    kind: 'import',
    sourceId: 'source',
    fromFilePath: 'src/source.ts',
    ...overrides,
  };
}

describe('plugins/routing', () => {
  it('returns extension-specific plugins followed by wildcard plugins', () => {
    const plugins = new Map<string, IRoutablePluginInfo>([
      ['typescript', { plugin: plugin('typescript', ['.ts']) }],
      ['wildcard', { plugin: plugin('wildcard', ['*']) }],
    ]);
    const extensionMap = new Map([
      ['.ts', ['typescript']],
      ['*', ['wildcard']],
    ]);

    expect(getPluginsForExtension('.TS', plugins, extensionMap).map((candidate) => candidate.id)).toEqual([
      'typescript',
      'wildcard',
    ]);
  });

  it('projects file analysis relations with plugin provenance and normalized defaults', () => {
    const analysis: IFileAnalysisResult = {
      filePath: 'src/source.ts',
      relations: [
        {
          kind: 'import',
          sourceId: 'import-target',
          fromFilePath: 'src/source.ts',
          toFilePath: 'src/target.ts',
          pluginId: undefined,
          metadata: { importedName: 'target' },
        },
        {
          kind: 'call',
          sourceId: 'call-run',
          fromFilePath: 'src/source.ts',
          specifier: 'run',
          resolvedPath: 'src/run.ts',
          pluginId: 'existing',
        },
      ],
    };

    expect(toProjectedConnectionsFromFileAnalysis(withPluginProvenance(plugin('typescript', ['.ts']), analysis))).toEqual([
      {
        kind: 'import',
        pluginId: 'typescript',
        sourceId: 'import-target',
        specifier: '',
        resolvedPath: 'src/target.ts',
        type: undefined,
        variant: undefined,
        metadata: { importedName: 'target' },
      },
      {
        kind: 'call',
        pluginId: 'existing',
        sourceId: 'call-run',
        specifier: 'run',
        resolvedPath: 'src/run.ts',
        type: undefined,
        variant: undefined,
        metadata: undefined,
      },
    ]);
  });

  it('merges core and plugin analysis while swallowing plugin failures', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const plugins = new Map<string, IRoutablePluginInfo>([
      ['first', {
        plugin: plugin('first', ['.ts'], async () => ({
          filePath: 'src/app.ts',
          relations: [{
            kind: 'import',
            sourceId: 'first-import',
            fromFilePath: 'src/app.ts',
            toFilePath: 'src/first.ts',
          }],
        })),
      }],
      ['failing', {
        plugin: plugin('failing', ['.ts'], async () => {
          throw new Error('boom');
        }),
      }],
    ]);
    const extensionMap = new Map([['.ts', ['first', 'failing']]]);

    await expect(analyzeFileResult(
      'src/app.ts',
      'content',
      '/workspace',
      plugins,
      extensionMap,
      async () => ({
        filePath: 'src/app.ts',
        relations: [{
          kind: 'reference',
          sourceId: 'core-reference',
          fromFilePath: 'src/app.ts',
          toFilePath: 'src/core.ts',
        }],
      }),
    )).resolves.toEqual({
      filePath: 'src/app.ts',
      nodes: [],
      relations: [
        {
          kind: 'reference',
          sourceId: 'core-reference',
          fromFilePath: 'src/app.ts',
          toFilePath: 'src/core.ts',
        },
        {
          kind: 'import',
          sourceId: 'first-import',
          fromFilePath: 'src/app.ts',
          toFilePath: 'src/first.ts',
          pluginId: 'first',
        },
      ],
      symbols: [],
      nodeTypes: [],
      edgeTypes: [],
    });
    expect(consoleError).toHaveBeenCalledWith(
      '[CodeGraphy] Error analyzing src/app.ts with failing:',
      expect.any(Error),
    );
    consoleError.mockRestore();
  });

  it('limits plugin analysis to selected plugin ids when requested', async () => {
    const selected = plugin('selected', ['.ts'], vi.fn(async () => ({
      filePath: 'src/app.ts',
      relations: [relation({
        sourceId: 'selected-import',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/selected.ts',
      })],
    })));
    const skipped = plugin('skipped', ['.ts'], vi.fn(async () => ({
      filePath: 'src/app.ts',
      relations: [relation({
        sourceId: 'skipped-import',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/skipped.ts',
      })],
    })));
    const plugins = new Map<string, IRoutablePluginInfo>([
      ['selected', { plugin: selected }],
      ['skipped', { plugin: skipped }],
    ]);
    const extensionMap = new Map([['.ts', ['selected', 'skipped']]]);

    await expect(analyzeFileResult(
      'src/app.ts',
      'content',
      '/workspace',
      plugins,
      extensionMap,
      undefined,
      undefined,
      { pluginIds: new Set(['selected']) },
    )).resolves.toEqual({
      filePath: 'src/app.ts',
      nodes: [],
      relations: [{
        kind: 'import',
        sourceId: 'selected-import',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/selected.ts',
        pluginId: 'selected',
      }],
      symbols: [],
      nodeTypes: [],
      edgeTypes: [],
    });
    expect(selected.analyzeFile).toHaveBeenCalledOnce();
    expect(skipped.analyzeFile).not.toHaveBeenCalled();
  });

  it('returns normalized core analysis when no plugins match', async () => {
    await expect(analyzeFileResult(
      'README.md',
      'content',
      '/workspace',
      new Map(),
      new Map(),
      async () => ({
        filePath: 'README.md',
        relations: [{
          kind: 'reference',
          sourceId: 'doc-reference',
          fromFilePath: 'README.md',
          toFilePath: 'docs/guide.md',
        }],
      }),
    )).resolves.toEqual({
      filePath: 'README.md',
      nodes: [],
      relations: [{
        kind: 'reference',
        sourceId: 'doc-reference',
        fromFilePath: 'README.md',
        toFilePath: 'docs/guide.md',
      }],
      symbols: [],
      nodeTypes: [],
      edgeTypes: [],
    });
  });

  it('returns null when neither core nor plugins can analyze the file', async () => {
    await expect(analyzeFileResult(
      'README.md',
      'content',
      '/workspace',
      new Map(),
      new Map(),
    )).resolves.toBeNull();
  });

  it('returns an empty analysis result when matching plugins have no analyze hook', async () => {
    const plugins = new Map<string, IRoutablePluginInfo>([
      ['metadata-only', { plugin: plugin('metadata-only', ['.md']) }],
    ]);
    const extensionMap = new Map([['.md', ['metadata-only']]]);

    await expect(analyzeFileResult(
      'README.md',
      'content',
      '/workspace',
      plugins,
      extensionMap,
    )).resolves.toEqual({
      filePath: 'README.md',
      nodes: [],
      relations: [],
      symbols: [],
      nodeTypes: [],
      edgeTypes: [],
    });
  });

  it('matches plugin declarations case-insensitively after normalization', () => {
    const plugins = new Map<string, IRoutablePluginInfo>([
      ['typescript', { plugin: plugin('typescript', ['.TS']) }],
      ['wildcard', { plugin: plugin('wildcard', ['*']) }],
    ]);
    const extensionMap = new Map([
      ['.ts', ['typescript']],
      ['*', ['wildcard']],
    ]);

    expect(getPluginsForExtension('TS', plugins, extensionMap).map((candidate) => candidate.id)).toEqual([
      'typescript',
      'wildcard',
    ]);
  });

  it('routes through the registry facade for wildcard support checks', () => {
    const registry = new CorePluginRegistry();
    registry.register(plugin('wildcard', ['*']));

    expect(registry.supportsFile('src/app.anything')).toBe(true);
    expect(registry.getPluginsForExtension('.anything').map((candidate) => candidate.id)).toEqual(['wildcard']);
  });

  it('returns the first available plugin for a file, falling back to wildcard plugins', () => {
    const wildcard = plugin('wildcard', ['*']);
    const plugins = new Map<string, IRoutablePluginInfo>([
      ['wildcard', { plugin: wildcard }],
    ]);
    const extensionMap = new Map([
      ['.ts', ['missing-typescript']],
      ['*', ['wildcard']],
    ]);

    expect(getPluginForFile('src/app.ts', plugins, extensionMap)).toBe(wildcard);
    expect(getPluginForFile('src/app.rb', new Map(), new Map())).toBeUndefined();
  });

  it('returns plugin and plugin-info lists for matching file extensions', () => {
    const typescript = plugin('typescript', ['.ts']);
    const wildcard = plugin('wildcard', ['*']);
    const plugins = new Map<string, IRoutablePluginInfo>([
      ['typescript', { plugin: typescript, options: { strict: true } }],
      ['wildcard', { plugin: wildcard }],
    ]);
    const extensionMap = new Map([
      ['.ts', ['typescript', 'missing']],
      ['*', ['wildcard']],
    ]);

    expect(getPluginsForFile('src/app.TS', plugins, extensionMap)).toEqual([typescript, wildcard]);
    expect(getPluginInfosForFile('src/app.ts', plugins, extensionMap)).toEqual([
      { plugin: typescript, options: { strict: true } },
      { plugin: wildcard },
    ]);
  });

  it('reports support and supported extension keys from the extension map', () => {
    const extensionMap = new Map([
      ['.ts', ['typescript']],
      ['*', ['wildcard']],
    ]);

    expect(supportsFile('src/app.ts', extensionMap)).toBe(true);
    expect(supportsFile('src/app.rb', new Map([['.ts', ['typescript']]]))).toBe(false);
    expect(supportsFile('src/app.rb', extensionMap)).toBe(true);
    expect(getSupportedExtensions(extensionMap)).toEqual(['.ts', '*']);
  });

  it('builds stable relation keys from base relation identity fields', () => {
    expect(getRelationKey(relation({
      kind: 'import',
      sourceId: 'import-source',
      fromFilePath: 'src/a.ts',
      fromNodeId: 'node:a',
      fromSymbolId: 'symbol:a',
      specifier: './b',
      type: 'static',
      variant: 'value',
      toFilePath: 'src/b.ts',
    }))).toBe('import|import-source|src/a.ts|node:a|symbol:a|./b|static|value');
  });

  it('adds node and symbol destinations for non-resolved relation kinds', () => {
    expect(getRelationKey(relation({
      kind: 'import',
      toFilePath: 'src/b.ts',
      toNodeId: 'node:b',
      toSymbolId: 'symbol:b',
      resolvedPath: 'src/resolved.ts',
    }))).toBe('import|source|src/source.ts||||||node:b|symbol:b');
  });

  it('adds file, node, symbol, and resolved destinations for call and reference relations', () => {
    expect(getRelationKey(relation({
      kind: 'call',
      sourceId: 'call-run',
      specifier: 'run',
      toFilePath: 'src/run.ts',
      toNodeId: 'node:run',
      toSymbolId: 'symbol:run',
      resolvedPath: 'src/run.ts',
    }))).toBe('call|call-run|src/source.ts|||run|||src/run.ts|node:run|symbol:run|src/run.ts');

    expect(getRelationKey(relation({
      kind: 'reference',
      sourceId: 'reference-user',
      toFilePath: 'src/user.ts',
    }))).toBe('reference|reference-user|src/source.ts||||||src/user.ts|||');
  });

  it('includes resolved destinations for event relations', () => {
    expect(getRelationKey(relation({
      kind: 'event',
      sourceId: 'unity-event',
      fromSymbolId: 'button-component',
      specifier: 'Toggle',
      toFilePath: 'src/controls-hint.ts',
      resolvedPath: 'src/controls-hint.ts',
    }))).not.toBe(getRelationKey(relation({
      kind: 'event',
      sourceId: 'unity-event',
      fromSymbolId: 'button-component',
      specifier: 'Toggle',
      toFilePath: 'src/menu-controller.ts',
      resolvedPath: 'src/menu-controller.ts',
    })));
  });
});
