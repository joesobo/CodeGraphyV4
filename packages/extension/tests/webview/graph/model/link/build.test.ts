import { describe, expect, it } from 'vitest';
import { buildGraphLinks } from '../../../../../src/webview/components/graph/model/link/build';

describe('graph/model/link/build direct coverage', () => {
  it('defaults one-way links to bidirectional false with no base color', () => {
    const links = buildGraphLinks(
      [{ id: 'edge-1', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] }],
      'separate',
    );

    expect(links).toEqual([
      expect.objectContaining({
        id: 'edge-1',
        bidirectional: false,
        baseColor: undefined,
      }),
    ]);
  });

  it('marks merged reverse links as bidirectional and colors them blue', () => {
    const links = buildGraphLinks(
      [
        { id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] },
        { id: 'b.ts->a.ts', from: 'b.ts', to: 'a.ts', kind: 'import', sources: [] },
      ],
      'combined',
    );

    expect(links).toEqual([
      expect.objectContaining({
        id: 'a.ts<->b.ts#import',
        bidirectional: true,
        baseColor: '#60a5fa',
      }),
    ]);
  });
});
