import { describe, expect, it } from 'vitest';
import { countTooltipEdges } from '../../../../src/webview/components/graph/tooltip/edgeCounts';

describe('graph/tooltip/edgeCounts', () => {
  it('counts incoming and outgoing edges for the tooltip node', () => {
    expect(countTooltipEdges('node-a', {
      edges: [
        { id: 'a-b', from: 'node-a', to: 'node-b', kind: 'import', sources: [] },
        { id: 'c-a', from: 'node-c', to: 'node-a', kind: 'import', sources: [] },
        { id: 'a-a', from: 'node-a', to: 'node-a', kind: 'call', sources: [] },
        { id: 'c-b', from: 'node-c', to: 'node-b', kind: 'import', sources: [] },
      ],
    })).toEqual({
      incomingCount: 2,
      outgoingCount: 2,
    });
  });
});
