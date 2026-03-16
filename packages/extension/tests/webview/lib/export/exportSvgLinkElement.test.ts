import { describe, expect, it } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../../src/shared/types';
import { buildLinkElement } from '../../../../src/webview/lib/export/exportSvgLinkElement';
import type { SvgExportLink } from '../../../../src/webview/lib/export/exportSvgTypes';

describe('exportSvgLinkElement', () => {
  it('renders straight links when curvature is omitted or within the epsilon', () => {
    const link: SvgExportLink = {
      source: 'a',
      target: 'b',
      bidirectional: false,
      curvature: 0.001,
    };

    expect(buildLinkElement(link, { x: 1, y: 2 }, { x: 3, y: 4 }, false)).toBe(
      `<line x1="1" y1="2" x2="3" y2="4" stroke="${DEFAULT_DIRECTION_COLOR}" stroke-width="1"/>`
    );
  });

  it('renders curved bidirectional links with arrow markers', () => {
    const link: SvgExportLink = {
      source: 'a',
      target: 'b',
      bidirectional: true,
      baseColor: '#0ea5e9',
      curvature: 0.5,
    };

    expect(buildLinkElement(link, { x: 1, y: 2 }, { x: 8, y: 5 }, true)).toBe(
      '<path d="M1,2 Q3,7 8,5" fill="none" stroke="#0ea5e9" stroke-width="2" marker-end="url(#arrowhead)"/>'
    );
  });
});
