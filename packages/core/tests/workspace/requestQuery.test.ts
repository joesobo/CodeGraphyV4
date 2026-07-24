import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { requestCodeGraphyIndexWorkspace } from '../../src/workspace/requestIndexing';
import { requestWorkspaceGraphQuery } from '../../src/workspace/requestQuery';

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
