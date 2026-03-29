import { describe, expect, it } from 'vitest';
import { buildNodeLabelElement, buildNodeShapeElement } from '../../../../../src/webview/export/svg/node/markup';
import type { SvgExportNode } from '../../../../../src/webview/export/svg/contracts';

describe('exportSvgNodeMarkup', () => {
  const node: SvgExportNode = {
    id: 'alpha',
    label: 'A & <B>',
    size: 12,
    color: '#123456',
    borderColor: '#654321',
    borderWidth: 3,
    shape2D: 'diamond',
  };

  it('renders circle and non-circle node shapes', () => {
    expect(buildNodeShapeElement({ ...node, shape2D: 'circle' }, { x: 20, y: 30 }, 'circle')).toBe(
      '<circle cx="20" cy="30" r="12" fill="#123456" stroke="#654321" stroke-width="3"/>'
    );

    expect(buildNodeShapeElement(node, { x: 20, y: 30 }, 'diamond')).toBe(
      '<path d="M20,18L32,30L20,42L8,30Z" fill="#123456" stroke="#654321" stroke-width="3"/>'
    );
  });

  it('escapes label text and positions the label below the node', () => {
    expect(buildNodeLabelElement(node, { x: 20, y: 30 }, '#f8fafc')).toBe(
      '<text x="20" y="56" text-anchor="middle" fill="#f8fafc" font-size="12" font-family="sans-serif">A &amp; &lt;B&gt;</text>'
    );
  });
});
