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
    edgeType: 'import',
    sourceId: 'source',
    from: { kind: 'file', filePath: 'src/source.ts' },
    target: { kind: 'unresolved', specifier: '' },
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
          edgeType: 'import',
          sourceId: 'import-target',
          from: { kind: 'file', filePath: 'src/source.ts' },
          target: { kind: 'file', path: 'src/target.ts', pathKind: 'workspace-relative' },
          pluginId: undefined,
          metadata: { importedName: 'target' },
        },
        {
          edgeType: 'call',
          sourceId: 'call-run',
          from: { kind: 'file', filePath: 'src/source.ts' },
          specifier: 'run',
          target: { kind: 'file', path: 'src/run.ts', pathKind: 'workspace-relative', specifier: 'run' },
          pluginId: 'existing',
        },
      ],
    };

    expect(toProjectedConnectionsFromFileAnalysis(withPluginProvenance(plugin('typescript', ['.ts']), analysis), '')).toEqual([
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
            edgeType: 'import',
            sourceId: 'first-import',
            from: { kind: 'file', filePath: 'src/app.ts' },
            target: { kind: 'file', path: 'src/first.ts', pathKind: 'workspace-relative' },
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
          edgeType: 'reference',
          sourceId: 'core-reference',
          from: { kind: 'file', filePath: 'src/app.ts' },
          target: { kind: 'file', path: 'src/core.ts', pathKind: 'workspace-relative' },
        }],
      }),
    )).resolves.toEqual({
      filePath: 'src/app.ts',
      nodes: [],
      relations: [
        {
          edgeType: 'reference',
          sourceId: 'core-reference',
          from: { kind: 'file', filePath: 'src/app.ts' },
          target: { kind: 'file', path: 'src/core.ts', pathKind: 'workspace-relative' },
        },
        {
          edgeType: 'import',
          sourceId: 'first-import',
          from: { kind: 'file', filePath: 'src/app.ts' },
          target: { kind: 'file', path: 'src/first.ts', pathKind: 'workspace-relative' },
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
          edgeType: 'reference',
          sourceId: 'doc-reference',
          from: { kind: 'file', filePath: 'README.md' },
          target: { kind: 'file', path: 'docs/guide.md', pathKind: 'workspace-relative' },
        }],
      }),
    )).resolves.toEqual({
      filePath: 'README.md',
      nodes: [],
      relations: [{
        edgeType: 'reference',
        sourceId: 'doc-reference',
        from: { kind: 'file', filePath: 'README.md' },
        target: { kind: 'file', path: 'docs/guide.md', pathKind: 'workspace-relative' },
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
    expect(getRelationKey('src/source.ts', relation({
      edgeType: 'import',
      sourceId: 'import-source',
      from: { kind: 'symbol', symbolId: 'symbol:a', filePath: 'src/a.ts' },
      specifier: './b',
      timing: 'static',
      variant: 'value',
      target: { kind: 'file', path: 'src/b.ts', pathKind: 'workspace-relative', specifier: './b' },
    }))).toBe('import|import-source|src/a.ts||symbol:a|./b|static|value');
  });

  it('adds node and symbol destinations for non-resolved relation kinds', () => {
    expect(getRelationKey('src/source.ts', relation({
      edgeType: 'import',
      target: { kind: 'symbol', symbolId: 'symbol:b', filePath: 'src/resolved.ts' },
    }))).toBe('import|source|src/source.ts|||||||symbol:b');
  });

  it('adds file, node, symbol, and resolved destinations for call and reference relations', () => {
    expect(getRelationKey('src/source.ts', relation({
      edgeType: 'call',
      sourceId: 'call-run',
      specifier: 'run',
      target: { kind: 'symbol', symbolId: 'symbol:run', filePath: 'src/run.ts', specifier: 'run' },
    }))).toBe('call|call-run|src/source.ts|||run|||src/run.ts||symbol:run');

    expect(getRelationKey('src/source.ts', relation({
      edgeType: 'reference',
      sourceId: 'reference-user',
      target: { kind: 'file', path: 'src/user.ts', pathKind: 'workspace-relative' },
    }))).toBe('reference|reference-user|src/source.ts||||||src/user.ts||');
  });
});
