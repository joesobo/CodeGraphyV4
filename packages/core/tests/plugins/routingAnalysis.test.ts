import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { describe, expect, it, vi } from 'vitest';
import {
  analyzeFileResult,
  toProjectedConnectionsFromFileAnalysis,
  withPluginProvenance,
} from '../../src';
import type { IRoutablePluginInfo } from '../../src/plugins/routing/router/lookups';
import { plugin, relation } from './routingFixture';

describe('plugins/routing', () => {
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
});
