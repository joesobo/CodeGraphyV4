import { describe, expect, it } from 'vitest';
import { processEdges } from '../../../../src/webview/components/graph/model/edgeProcessing';

describe('graph/model/edgeProcessing', () => {
  it('combines reverse edges into one bidirectional edge in combined mode', () => {
    expect(
      processEdges(
        [
          { id: 'b.ts->a.ts', from: 'b.ts', to: 'a.ts' },
          { id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' },
        ],
        'combined'
      )
    ).toEqual([
      { id: 'a.ts<->b.ts', from: 'a.ts', to: 'b.ts', bidirectional: true },
    ]);
  });

  it('keeps each edge separate in separate mode', () => {
    expect(
      processEdges(
        [
          { id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' },
          { id: 'b.ts->a.ts', from: 'b.ts', to: 'a.ts' },
        ],
        'separate'
      )
    ).toEqual([
      { id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts', bidirectional: false },
      { id: 'b.ts->a.ts', from: 'b.ts', to: 'a.ts', bidirectional: false },
    ]);
  });

  it('skips duplicate reverse pairs once they have been combined', () => {
    expect(
      processEdges(
        [
          { id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' },
          { id: 'b.ts->a.ts', from: 'b.ts', to: 'a.ts' },
          { id: 'b.ts->a.ts#2', from: 'b.ts', to: 'a.ts' },
          { id: 'b.ts->c.ts', from: 'b.ts', to: 'c.ts' },
        ],
        'combined'
      )
    ).toEqual([
      { id: 'a.ts<->b.ts', from: 'a.ts', to: 'b.ts', bidirectional: true },
      { id: 'b.ts->c.ts', from: 'b.ts', to: 'c.ts', bidirectional: false },
    ]);
  });
});
