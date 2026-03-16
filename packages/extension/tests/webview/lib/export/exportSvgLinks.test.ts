import { describe, expect, it } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../../src/shared/types';
import { appendLinkElements } from '../../../../src/webview/lib/export/exportSvgLinks';
import type { SvgExportLink } from '../../../../src/webview/lib/export/exportSvgTypes';

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
});
