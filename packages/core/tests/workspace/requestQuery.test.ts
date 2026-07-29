import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { requestCodeGraphyIndexWorkspace } from '../../src/workspace/requestIndexing';
import { requestWorkspaceGraphQuery } from '../../src/workspace/requestQuery';
import {
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyWorkspaceSettings,
} from '../../src/workspace/settings';

describe('workspace/requestQuery', () => {
  it('searches current source text and cached AST Symbols through one bounded report', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-search-'));
    await fs.writeFile(path.join(workspaceRoot, 'entry.ts'), [
      'export function runIndexCommand(): void {',
      '  process.stderr.write(`Indexing ${workspaceRoot}...`);',
      '}',
      '',
    ].join('\n'));
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });

    const symbolResult = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'search',
      arguments: { pattern: 'runIndexCommand', limit: 20 },
    });
    const textResult = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'search',
      arguments: { pattern: 'Indexing ', limit: 20 },
    });

    expect(symbolResult).toMatchObject({
      sources: { symbols: { freshness: 'cached', cacheState: 'fresh' } },
    });
    expect(symbolResult.matches).toEqual(expect.arrayContaining([{
      type: 'symbol',
      symbol: expect.objectContaining({ name: 'runIndexCommand', kind: 'function', filePath: 'entry.ts' }),
    }]));
    expect(textResult).toMatchObject({
      matches: [{
        type: 'text',
        filePath: 'entry.ts',
        line: 2,
        excerpt: '  process.stderr.write(`Indexing ${workspaceRoot}...`);',
      }],
      sources: { text: { freshness: 'live', filesScanned: 1, filesSkipped: 0 } },
    });
  });

  it('builds a task-personalized File map from live terms and cached Relationships', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-task-map-'));
    await fs.writeFile(path.join(workspaceRoot, 'setting.ts'), 'export function readSetting(): string { return "value"; }\n');
    await fs.writeFile(path.join(workspaceRoot, 'command.ts'), [
      "import { readSetting } from './setting';",
      'export function runCommand(): string { return readSetting(); }',
      '',
    ].join('\n'));
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });

    const result = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'task-map',
      arguments: { query: 'setting command', limit: 4 },
    });

    expect(result).toMatchObject({
      terms: ['setting', 'command'],
      files: [
        { path: 'command.ts', matchedTerms: ['setting', 'command'] },
        { path: 'setting.ts', matchedTerms: ['setting'] },
      ],
      relationships: [{ from: 'command.ts', to: 'setting.ts', edgeTypes: expect.arrayContaining(['import']) }],
      limits: { complete: true },
      sources: { text: { freshness: 'live' }, graph: { freshness: 'cached', cacheState: 'fresh' } },
    });

    const projected = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'task-map',
      arguments: { query: 'setting command', limit: 4 },
      projection: { edgeTypes: ['type-import'] },
    });
    expect(projected.files).toHaveLength(2);
    expect(projected.relationships).toEqual([]);
  });

  it('uses complete graph scope for an exact targeted Relationship query', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-target-scope-'));
    await fs.writeFile(path.join(workspaceRoot, 'dependency.ts'), [
      'export function readSetting(): string {',
      "  return 'value';",
      '}',
      '',
    ].join('\n'));
    await fs.writeFile(path.join(workspaceRoot, 'entry.ts'), [
      "import { readSetting } from './dependency';",
      'export function runCommand(): string {',
      '  return readSetting();',
      '}',
      '',
    ].join('\n'));
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });

    for (const projection of [undefined, { edgeTypes: ['call'] }]) {
      const result = await requestWorkspaceGraphQuery({
        workspacePath: workspaceRoot,
        report: 'edges',
        arguments: {
          from: 'entry.ts#runCommand:function',
          edgeType: 'call',
          limit: 20,
        },
        ...(projection ? { projection } : {}),
      });

      expect(result.edges).toEqual([{
        from: 'entry.ts#runCommand:function',
        to: 'dependency.ts#readSetting:function',
        edgeTypes: ['call'],
      }]);
    }
  });

  it('resolves targeted calls through named re-export barrels', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-reexport-'));
    await fs.writeFile(path.join(workspaceRoot, 'storage.ts'), [
      'export function readSetting(): string {',
      "  return 'value';",
      '}',
      '',
    ].join('\n'));
    await fs.writeFile(
      path.join(workspaceRoot, 'settings.ts'),
      "export { readSetting } from './storage';\n",
    );
    await fs.writeFile(path.join(workspaceRoot, 'entry.ts'), [
      "import { readSetting } from './settings';",
      'export function runCommand(): string {',
      '  return readSetting();',
      '}',
      '',
    ].join('\n'));
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });

    const result = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'edges',
      arguments: {
        from: 'entry.ts#runCommand:function',
        edgeType: 'call',
        limit: 20,
      },
      projection: { edgeTypes: ['call'] },
    });

    expect(result.edges).toEqual([{
      from: 'entry.ts#runCommand:function',
      to: 'storage.ts#readSetting:function',
      edgeTypes: ['call'],
    }]);

    const reexports = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'edges',
      arguments: {
        from: 'settings.ts',
        edgeType: 'reexport',
        limit: 20,
      },
      projection: { edgeTypes: ['reexport'] },
    });
    expect(reexports.edges).toEqual([{
      from: 'settings.ts',
      to: 'storage.ts#readSetting:function',
      edgeTypes: ['reexport'],
    }]);
  });

  it('keeps saved and one-off Filters out of Search and Target Query facts', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-filter-facts-'));
    await fs.mkdir(path.join(workspaceRoot, 'excluded'));
    await fs.writeFile(
      path.join(workspaceRoot, 'excluded', 'secret.ts'),
      'export function excludedSecret(): void {}\n',
    );
    await fs.writeFile(path.join(workspaceRoot, 'visible.ts'), 'export function visibleValue(): void {}\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });

    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      filterPatterns: ['excluded/**'],
    });
    const savedSearch = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'search',
      arguments: { pattern: 'excludedSecret', limit: 20 },
    });
    const savedTarget = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'overview',
      arguments: { target: 'excluded/secret.ts#excludedSecret:function' },
    });

    expect(savedSearch.matches).toEqual([]);
    expect(savedTarget).toMatchObject({ error: 'query_target_not_found' });

    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      filterPatterns: [],
    });
    const oneOffSearch = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'search',
      arguments: { pattern: 'excludedSecret', limit: 20 },
      projection: { filterPatterns: ['excluded/**'] },
    });
    const oneOffTarget = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'overview',
      arguments: { target: 'excluded/secret.ts#excludedSecret:function' },
      projection: { filterPatterns: ['excluded/**'] },
    });

    expect(oneOffSearch.matches).toEqual([]);
    expect(oneOffTarget).toMatchObject({ error: 'query_target_not_found' });
  });

  it('applies explicit Node and Edge Type projections to Search and Target Query', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-projection-'));
    await fs.writeFile(path.join(workspaceRoot, 'dependency.ts'), 'export function projectedTarget(): void {}\n');
    await fs.writeFile(path.join(workspaceRoot, 'entry.ts'), [
      "import { projectedTarget } from './dependency';",
      'export function projectedCaller(): void { projectedTarget(); }',
      '',
    ].join('\n'));
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });

    const search = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'search',
      arguments: { pattern: 'projectedCaller', limit: 20 },
      projection: { nodeTypes: ['file'] },
    });
    const target = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'overview',
      arguments: { target: 'entry.ts' },
      projection: { edgeTypes: ['call'] },
    });

    expect(search.matches).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'symbol' }),
    ]));
    expect(target).toMatchObject({
      outgoing: {
        edges: [expect.objectContaining({ edgeTypes: ['call'] })],
      },
    });
    const outgoing = (target as { outgoing?: { edges: { edgeTypes: string[] }[] } }).outgoing?.edges ?? [];
    expect(outgoing).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ edgeTypes: expect.arrayContaining(['import']) }),
    ]));
  });

  it('honors an explicit contains projection in Target Query', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-contains-'));
    await fs.writeFile(workspaceRoot + '/entry.ts', 'export function containedSymbol(): void {}\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });

    const result = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'overview',
      arguments: { target: 'entry.ts' },
      projection: { edgeTypes: ['contains'] },
    });

    expect(result).toMatchObject({
      outgoing: {
        edges: [{
          from: 'entry.ts',
          to: 'entry.ts#containedSymbol:function',
          edgeTypes: ['contains'],
        }],
      },
    });
  });

  it('marks cached Symbols stale after their indexed source file is deleted', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-deleted-'));
    const entryPath = path.join(workspaceRoot, 'entry.ts');
    await fs.writeFile(entryPath, 'export function deletedSymbol(): void {}\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
    await fs.rm(entryPath);

    const result = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'search',
      arguments: { pattern: 'deletedSymbol', limit: 20 },
    });

    expect(result).toMatchObject({
      matches: [{ type: 'symbol', symbol: { name: 'deletedSymbol', filePath: 'entry.ts' } }],
      sources: { symbols: { freshness: 'cached', cacheState: 'stale' } },
    });
  });

  it('reads live text after Indexing while marking cached Symbols stale', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-live-text-'));
    const entryPath = path.join(workspaceRoot, 'entry.ts');
    await fs.writeFile(entryPath, 'export const original = 1;\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
    await fs.writeFile(entryPath, 'export const changedAfterIndex = 2;\n');

    const result = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'search',
      arguments: { pattern: 'changedAfterIndex', limit: 20 },
    });

    expect(result).toMatchObject({
      matches: [{ type: 'text', filePath: 'entry.ts', line: 1 }],
      sources: { symbols: { freshness: 'cached', cacheState: 'stale' } },
    });
  });
});
