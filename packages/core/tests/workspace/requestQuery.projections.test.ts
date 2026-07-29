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

  it('does not let invalid report arguments bypass saved Graph Scope', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-invalid-arguments-'));
    await fs.writeFile(workspaceRoot + '/entry.ts', 'export function hiddenBySavedScope(): void {}\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });

    const result = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'nodes',
      arguments: { target: 'entry.ts' },
    } as Parameters<typeof requestWorkspaceGraphQuery>[0]);

    expect(result.nodes).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeType: expect.stringMatching(/^symbol:/u) }),
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
});
