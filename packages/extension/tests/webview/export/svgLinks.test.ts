import { describe, expect, it } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../src/shared/contracts';
import { appendLinkElements } from '../../../src/webview/export/svgLinks';
import type { SvgExportLink } from '../../../src/webview/export/svgTypes';

describe('exportSvgLinks', () => {
  it('renders straight links with normalized source and target identifiers', () => {
    const parts: string[] = [];
    const links: SvgExportLink[] = [{
      source: { id: 'source' },
      target: 2,
      bidirectional: false,
      baseColor: '#ff00ff',
    }];
    const positionMap = new Map([
      ['source', { x: 10, y: 20 }],
      ['2', { x: 30, y: 40 }],
    ]);

    appendLinkElements(parts, links, positionMap, true);

    expect(parts).toEqual([
      '<line x1="10" y1="20" x2="30" y2="40" stroke="#ff00ff" stroke-width="1" marker-end="url(#arrowhead)"/>',
    ]);
  });

  it('renders curved bidirectional links and skips unresolved nodes', () => {
    const parts: string[] = [];
    const links: SvgExportLink[] = [
      {
        source: 'a',
        target: 'b',
        bidirectional: true,
        curvature: 0.5,
      },
      {
        source: undefined,
        target: 'missing',
        bidirectional: false,
      },
      {
        source: {},
        target: 'b',
        bidirectional: false,
      },
      {
        source: 'b',
        target: 'c',
        bidirectional: false,
      },
    ];
    const positionMap = new Map([
      ['a', { x: 0, y: 0 }],
      ['b', { x: 10, y: 0 }],
    ]);

    appendLinkElements(parts, links, positionMap, false);

    expect(parts).toEqual([
      `<path d="M0,0 Q5,5 10,0" fill="none" stroke="${DEFAULT_DIRECTION_COLOR}" stroke-width="2"/>`,
    ]);
  });

  it('skips links with missing endpoint ids even when the position map contains null keys', () => {
    const parts: string[] = [];
    const links: SvgExportLink[] = [
      {
        source: undefined,
        target: 'b',
        bidirectional: false,
      },
      {
        source: 'a',
        target: {},
        bidirectional: false,
      },
    ];
    const positionMap = new Map<unknown, { x: number; y: number }>([
      [null, { x: 100, y: 100 }],
      ['a', { x: 0, y: 0 }],
      ['b', { x: 10, y: 10 }],
    ]);

    appendLinkElements(
      parts,
      links,
      positionMap as unknown as Map<string, { x: number; y: number }>,
      false
    );

    expect(parts).toEqual([]);
  });
});
