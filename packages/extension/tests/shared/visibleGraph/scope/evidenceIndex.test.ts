import { describe, expect, it } from 'vitest';
import { getGraphEvidenceIndex } from '../../../../src/shared/visibleGraph/scope/evidenceIndex';
import { edge, node, symbolNode } from './fixture';

describe('shared/visibleGraph/scope/evidenceIndex', () => {
  it('indexes node kinds, edge kinds, and symbol ownership once per evidence graph', () => {
    const graphData = {
      nodes: [
        node('src/app.ts'),
        symbolNode('src/app.ts#run:function', {
          filePath: 'src/app.ts',
          id: 'src/app.ts#run:function',
          kind: 'function',
          name: 'run',
        }),
      ],
      edges: [edge('src/app.ts', 'src/app.ts#run:function', 'contains')],
    };

    const first = getGraphEvidenceIndex(graphData);
    const second = getGraphEvidenceIndex(graphData);

    expect(second).toBe(first);
    expect(first.nodeIdsByKind.get('file')).toEqual(new Set(['src/app.ts']));
    expect(first.nodeIdsByKind.get('symbol')).toEqual(new Set(['src/app.ts#run:function']));
    expect(first.edgeIdsByKind.get('contains')).toEqual(
      new Set(['src/app.ts->src/app.ts#run:function#contains']),
    );
    expect(first.symbolOwnerById.get('src/app.ts#run:function')).toBe('src/app.ts');
  });
});
