import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../src/graph/contracts';
import { buildGraphModel } from '../../src/graphModel';

describe('core/graphModel buildGraphModel', () => {
  it('returns graph model data for an available relationship graph', () => {
    const graphData: IGraphData = {
      nodes: [
        { id: 'src/app.ts', label: 'app.ts', color: '#111111' },
      ],
      edges: [],
    };

    expect(buildGraphModel(graphData)).toEqual({
      graphData,
      regexError: null,
    });
  });
});
