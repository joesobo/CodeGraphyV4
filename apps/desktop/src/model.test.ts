import { describe, expect, it } from 'vitest';
import { buildFileTree, formatGraphCounts, parseWorkspaceGraphResult } from './model';

const graphResult = {
  kind: 'ready',
  workspaceRoot: '/workspace',
  graphCache: '.codegraphy/graph.sqlite',
  cacheStatus: { state: 'fresh', staleReasons: [] },
  graph: {
    nodes: [
      { id: 'README.md', label: 'README.md' },
      { id: 'src/index.ts', label: 'index.ts' },
      { id: 'src/model/value.ts', label: 'value.ts' },
      { id: 'src', label: 'src', nodeType: 'folder' },
    ],
    edges: [
      { id: 'src/index.ts->src/model/value.ts#import', from: 'src/index.ts', to: 'src/model/value.ts', kind: 'import' },
    ],
  },
} satisfies unknown;

describe('desktop workspace graph model', () => {
  it('counts displayed File and Folder Nodes plus every displayed Relationship', () => {
    expect(formatGraphCounts({
      nodes: [
        { id: 'src', label: 'src', nodeType: 'folder' },
        { id: 'src/index.ts', label: 'index.ts', nodeType: 'file' },
      ],
      edges: [
        { id: 'a', from: 'src', to: 'src/index.ts', kind: 'nests' },
        { id: 'b', from: 'src', to: 'src/index.ts', kind: 'contains' },
      ],
    })).toBe('2 Nodes · 2 Relationships');
  });

  it('parses a File and Folder-only graph and builds the File hierarchy', () => {
    const result = parseWorkspaceGraphResult(graphResult);

    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') return;
    expect(buildFileTree(result.graph)).toEqual([
      { kind: 'file', name: 'README.md', path: 'README.md' },
      {
        kind: 'folder',
        name: 'src',
        path: 'src',
        children: [
          { kind: 'file', name: 'index.ts', path: 'src/index.ts' },
          {
            kind: 'folder',
            name: 'model',
            path: 'src/model',
            children: [
              { kind: 'file', name: 'value.ts', path: 'src/model/value.ts' },
            ],
          },
        ],
      },
    ]);
  });

  it('rejects malformed graph Relationships at the process boundary', () => {
    const malformed: unknown = {
      ...graphResult,
      graph: {
        ...graphResult.graph,
        edges: [{ id: 'broken', from: 'src/index.ts', kind: 'import' }],
      },
    };

    expect(() => parseWorkspaceGraphResult(malformed)).toThrow('invalid Relationship Graph');
  });

  it('rejects Symbol Nodes at the desktop boundary', () => {
    const withSymbol: unknown = {
      ...graphResult,
      graph: {
        ...graphResult.graph,
        nodes: [
          ...graphResult.graph.nodes,
          {
            id: 'src/model/value.ts#value',
            label: 'value',
            nodeType: 'variable',
            symbol: { id: 'value', name: 'value', kind: 'variable', filePath: 'src/model/value.ts' },
          },
        ],
      },
    };

    expect(() => parseWorkspaceGraphResult(withSymbol)).toThrow('invalid Relationship Graph');
  });
});
