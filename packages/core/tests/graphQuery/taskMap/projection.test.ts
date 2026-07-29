import { describe, expect, it } from 'vitest';
import type { GraphQueryData } from '../../../src/graphQuery/data';
import {
  indexTaskMapSymbols,
  selectTaskMapRelationships,
} from '../../../src/graphQuery/taskMap/projection';

const filePaths = Array.from({ length: 14 }, (_, index) => `src/file-${index}.ts`);
const data: GraphQueryData = {
  graphData: {
    nodes: filePaths.map(path => ({ id: path, label: path, nodeType: 'file' as const })),
    edges: filePaths.slice(1).map((path, index) => ({
      id: `edge-${index}`,
      from: filePaths[0]!,
      to: path,
      kind: 'import' as const,
      sources: [],
    })),
  },
  symbols: Array.from({ length: 5 }, (_, index) => ({
    id: `src/file-0.ts#symbol${index}:function`,
    filePath: 'src/file-0.ts',
    name: `symbol${index}`,
    kind: 'function',
  })),
};

describe('core/graphQuery task map projection', () => {
  it('selects declarations that match task terms before alphabetical fallbacks', () => {
    const symbols = indexTaskMapSymbols({
      ...data,
      symbols: [
        { id: 'src/file-0.ts#alpha:function', filePath: 'src/file-0.ts', name: 'alpha', kind: 'function' },
        { id: 'src/file-0.ts#runtimeFailure:function', filePath: 'src/file-0.ts', name: 'runtimeFailure', kind: 'function' },
        { id: 'src/file-0.ts#beta:function', filePath: 'src/file-0.ts', name: 'beta', kind: 'function' },
        { id: 'src/file-0.ts#gamma:function', filePath: 'src/file-0.ts', name: 'gamma', kind: 'function' },
      ],
    }, ['runtime', 'failure']);

    expect(symbols.get('src/file-0.ts')?.map(symbol => symbol.name)).toEqual([
      'runtimeFailure',
      'alpha',
      'beta',
    ]);
  });

  it('bounds declarations and typed relationships with truthful completeness', () => {
    const symbols = indexTaskMapSymbols(data);
    const relationships = selectTaskMapRelationships(data, new Set(filePaths), 12);

    expect(symbols.get('src/file-0.ts')).toHaveLength(3);
    expect(relationships.relationships).toHaveLength(12);
    expect(relationships.relationships.every(item => item.edgeTypes[0] === 'import')).toBe(true);
    expect(relationships.complete).toBe(false);
  });
});
