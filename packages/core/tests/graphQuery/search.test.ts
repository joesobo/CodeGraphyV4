import { describe, expect, it } from 'vitest';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { IGraphData } from '../../src/graph/contracts';
import { searchGraph } from '../../src/graphQuery/search';

const graphData: IGraphData = {
  nodes: [
    { id: 'src/index.ts', label: 'index.ts', nodeType: 'file' },
    { id: 'tests/index.test.ts', label: 'index.test.ts', nodeType: 'file' },
    {
      id: 'src/index.ts#runIndexCommand:function',
      label: 'runIndexCommand',
      nodeType: 'symbol:function',
      symbol: {
        id: 'src/index.ts#runIndexCommand:function',
        filePath: 'src/index.ts',
        name: 'runIndexCommand',
        kind: 'function',
      },
    },
  ],
  edges: [],
};

const symbols: IAnalysisSymbol[] = [{
  id: 'src/index.ts#runIndexCommand:function',
  filePath: 'src/index.ts',
  name: 'runIndexCommand',
  kind: 'function',
  signature: 'async function runIndexCommand()',
  metadata: { language: 'typescript', source: 'core:treesitter' },
}];

function search(pattern: string) {
  return searchGraph({
    graphData,
    symbols,
    relations: [],
    sourceText: {
      files: [
        { filePath: 'src/index.ts', content: 'writeStatus(`Indexing ${workspace}...`);\n' },
        { filePath: 'tests/index.test.ts', content: "it('keeps non-verbose stderr clean', () => {});\n" },
      ],
      filesScanned: 2,
      filesSkipped: 0,
    },
    cacheState: 'fresh',
  }, { pattern, limit: 20 });
}

describe('core/graphQuery search', () => {
  it('merges cached AST Symbols with live source matches and file provenance', () => {
    expect(search('runIndexCommand')).toEqual({
      pattern: 'runIndexCommand',
      matches: [
        {
          type: 'symbol',
          symbol: {
            id: 'src/index.ts#runIndexCommand:function',
            filePath: 'src/index.ts',
            name: 'runIndexCommand',
            kind: 'function',
            signature: 'async function runIndexCommand()',
            language: 'typescript',
            source: 'core:treesitter',
          },
        },
      ],
      page: { offset: 0, limit: 20, returned: 1, total: 1, nextOffset: null },
      sources: {
        text: { freshness: 'live', filesScanned: 2, filesSkipped: 0 },
        symbols: { freshness: 'cached', cacheState: 'fresh' },
      },
    });
  });

  it('finds exact source text with one-based locations and bounded excerpts', () => {
    expect(search('Indexing ').matches).toEqual([
      {
        type: 'text',
        filePath: 'src/index.ts',
        line: 1,
        column: 14,
        excerpt: 'writeStatus(`Indexing ${workspace}...`);',
      },
    ]);
  });

  it('supports case-insensitive line-local star wildcards', () => {
    expect(search('*stderr clean').matches).toEqual([
      {
        type: 'text',
        filePath: 'tests/index.test.ts',
        line: 1,
        column: 1,
        excerpt: "it('keeps non-verbose stderr clean', () => {});",
      },
    ]);
  });

  it('ranks source paths related to the phrase ahead of documentation history', () => {
    const result = searchGraph({
      graphData,
      symbols,
      relations: [],
      sourceText: {
        files: [
          { filePath: 'CHANGELOG.md', content: 'Changed Indexing behavior.\n' },
          { filePath: 'src/cli/index/command.ts', content: 'writeStatus(`Indexing ${workspace}...`);\n' },
        ],
        filesScanned: 2,
        filesSkipped: 0,
      },
    }, { pattern: 'Indexing ', limit: 1 });

    expect(result.matches).toEqual([expect.objectContaining({
      type: 'text',
      filePath: 'src/cli/index/command.ts',
    })]);
    expect(result.page).toMatchObject({ returned: 1, total: 2, nextOffset: 1 });
  });
});
