import { describe, expect, it } from 'vitest';
import { buildGraphLayoutKey } from '../../../src/webview/components/graph/layoutKey';

describe('graph/layoutKey', () => {
  it('builds a stable key from node size mode, node ids, and link ids', () => {
    expect(
      buildGraphLayoutKey(
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
      buildGraphLayoutKey(
        {
          nodes: [] as never,
          links: [] as never,
        },
        'uniform',
      ),
    ).toBe('uniform::::');
  });
});
