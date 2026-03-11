import { describe, it, expect } from 'vitest';
import { computeLinkCurvature, CurvatureLink } from '../../../src/webview/lib/linkCurvature';

function makeLink(source: string, target: string): CurvatureLink {
  return { source, target };
}

describe('computeLinkCurvature', () => {
  it('does nothing for empty array', () => {
    const links: CurvatureLink[] = [];
    computeLinkCurvature(links);
    expect(links).toEqual([]);
  });

  it('leaves single link between two nodes unchanged (no curvature set)', () => {
    const links = [makeLink('A', 'B')];
    computeLinkCurvature(links);
    expect(links[0].curvature).toBeUndefined();
  });

  it('assigns curvature for two links between same nodes (opposite directions)', () => {
    const links = [makeLink('A', 'B'), makeLink('B', 'A')];
    computeLinkCurvature(links);
    // Both should have curvature set (visual distinction comes from swapped source/target)
    expect(links[0].curvature).toBeDefined();
    expect(links[1].curvature).toBeDefined();
    expect(links[0].curvature).toBe(0.5);
    expect(links[1].curvature).toBe(0.5);
  });

  it('assigns distinct curvatures for two links in same direction', () => {
    const links = [makeLink('A', 'B'), makeLink('A', 'B')];
    computeLinkCurvature(links);
    expect(links[0].curvature).toBeDefined();
    expect(links[1].curvature).toBeDefined();
    expect(links[0].curvature).not.toBe(links[1].curvature);
  });

  it('distributes curvatures evenly for 3+ parallel links', () => {
    const links = [makeLink('A', 'B'), makeLink('A', 'B'), makeLink('A', 'B')];
    computeLinkCurvature(links);
    const curvatures = links.map(l => l.curvature);
    // All should be defined
    expect(curvatures.every(c => c !== undefined)).toBe(true);
    // Should be evenly distributed and distinct
    const unique = new Set(curvatures);
    expect(unique.size).toBe(3);
  });

  it('assigns positive curvature (0.5 to 1) for self-loops', () => {
    const links = [makeLink('A', 'A'), makeLink('A', 'A')];
    computeLinkCurvature(links);
    for (const link of links) {
      expect(link.curvature).toBeGreaterThanOrEqual(0.5);
      expect(link.curvature).toBeLessThanOrEqual(1);
    }
  });

  it('single self-loop gets curvature 1', () => {
    const links = [makeLink('A', 'A')];
    computeLinkCurvature(links);
    expect(links[0].curvature).toBe(1);
  });

  it('works with object-style source/target (resolved nodes)', () => {
    const links: CurvatureLink[] = [
      { source: { id: 'A' }, target: { id: 'B' } },
      { source: { id: 'B' }, target: { id: 'A' } },
    ];
    computeLinkCurvature(links);
    expect(links[0].curvature).toBeDefined();
    expect(links[1].curvature).toBeDefined();
  });

  it('does not set curvature on single-link pairs among multi-link groups', () => {
    const links = [
      makeLink('A', 'B'),
      makeLink('A', 'B'),
      makeLink('C', 'D'), // single link, should stay undefined
    ];
    computeLinkCurvature(links);
    expect(links[0].curvature).toBeDefined();
    expect(links[1].curvature).toBeDefined();
    expect(links[2].curvature).toBeUndefined();
  });
});
