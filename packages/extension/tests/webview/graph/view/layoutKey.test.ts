import { describe, expect, it } from 'vitest';
import { buildGraphDataLayoutKey } from '../../../../src/webview/components/graph/view/layoutKey';

describe('graph/layoutKey', () => {
  it('builds a stable key from node size mode, node ids, and link ids', () => {
    expect(
      buildGraphDataLayoutKey(
        {
          nodes: [
            { id: 'src/a.ts' },
            { id: 'src/b.ts' },
          ] as never,
          links: [{ id: 'src/a.ts->src/b.ts' }] as never,
        },
        'connections',
      ),
    ).toBe('connections::src/a.ts|src/b.ts::src/a.ts->src/b.ts');
  });

  it('handles empty graph data', () => {
    expect(
      buildGraphDataLayoutKey(
        {
          nodes: [] as never,
          links: [] as never,
        },
        'connections',
      ),
    ).toBe('connections::::');
  });

  it('joins multiple link identifiers with the pipe separator', () => {
    expect(
      buildGraphDataLayoutKey(
        {
          nodes: [{ id: 'src/a.ts' }] as never,
          links: [{ id: 'edge-1' }, { id: 'edge-2' }] as never,
        },
        'connections',
      ),
    ).toBe('connections::src/a.ts::edge-1|edge-2');
  });
});
