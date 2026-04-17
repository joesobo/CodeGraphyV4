import { describe, expect, it } from 'vitest';
import { buildGraphLinks } from '../../../../../src/webview/components/graph/model/link/build';

describe('graph/model/link/build direct coverage', () => {
  it('marks combined reverse edges as bidirectional links', () => {
    const links = buildGraphLinks(
      [
        { id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] },
        { id: 'b.ts->a.ts', from: 'b.ts', to: 'a.ts' , kind: 'import', sources: [] },
      ],
      'combined'
    );

    expect(links).toEqual([
      expect.objectContaining({
        id: 'a.ts<->b.ts#import',
        source: 'a.ts',
        target: 'b.ts',
        bidirectional: true,
        baseColor: '#60a5fa',
      }),
    ]);
  });

  it('computes curvature for overlapping non-bidirectional links', () => {
    const links = buildGraphLinks(
      [
        { id: 'edge-1', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] },
        { id: 'edge-2', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] },
      ],
      'separate'
    );

    expect(links).toEqual([
      expect.objectContaining({ id: 'edge-1', curvature: -0.5, bidirectional: false }),
      expect.objectContaining({ id: 'edge-2', curvature: 0.5, bidirectional: false }),
    ]);
  });

  it('keeps different edge kinds straight when they share the same nodes', () => {
    const links = buildGraphLinks(
      [
        { id: 'edge-1', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] },
        { id: 'edge-2', from: 'a.ts', to: 'b.ts' , kind: 'call', sources: [] },
      ],
      'separate'
    );

    expect(links).toEqual([
      expect.objectContaining({ id: 'edge-1', bidirectional: false }),
      expect.objectContaining({ id: 'edge-2', bidirectional: false }),
    ]);
    expect(links[0]).not.toHaveProperty('curvature');
    expect(links[1]).not.toHaveProperty('curvature');
  });

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
  
  it('normalizes explicit bidirectional flags when separate mode forces one-way links', () => {
    const links = buildGraphLinks(
      [
        {
          id: 'edge-1',
          from: 'a.ts',
          to: 'b.ts',
          kind: 'import',
          sources: [],
        },
      ],
      'separate'
    );

    expect(links).toEqual([
      expect.objectContaining({
        id: 'edge-1',
        bidirectional: false,
        baseColor: undefined,
      }),
    ]);
  });
});
