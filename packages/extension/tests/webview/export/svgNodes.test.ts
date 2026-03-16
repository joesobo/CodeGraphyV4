import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appendNodeElements } from '../../../src/webview/export/svgNodes';
import type { SvgExportNode } from '../../../src/webview/export/svgTypes';

const nodeHarness = vi.hoisted(() => ({
  getImage: vi.fn(),
}));

vi.mock('../../../src/webview/components/graph/rendering/imageCache', () => ({
  getImage: nodeHarness.getImage,
}));

describe('exportSvgNodes', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

  beforeEach(() => {
    nodeHarness.getImage.mockReset();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
    })) as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,encoded');
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
  });

  it('renders node shapes and escapes labels when requested', () => {
    const parts: string[] = [];
    const definitions: string[] = [];
    const imageElements: string[] = [];
    const nodes: SvgExportNode[] = [{
      id: 'alpha',
      label: 'A & <B>',
      size: 12,
      color: '#123456',
      borderColor: '#654321',
      borderWidth: 3,
      shape2D: 'diamond',
    }];
    const positionMap = new Map([['alpha', { x: 20, y: 30 }]]);

    appendNodeElements(parts, definitions, imageElements, nodes, positionMap, true, '#f8fafc');

    expect(parts).toEqual([
      '<path d="M20,18L32,30L20,42L8,30Z" fill="#123456" stroke="#654321" stroke-width="3"/>',
      '<text x="20" y="56" text-anchor="middle" fill="#f8fafc" font-size="12" font-family="sans-serif">A &amp; &lt;B&gt;</text>',
    ]);
    expect(definitions).toEqual([]);
    expect(imageElements).toEqual([]);
  });

  it('creates clipped image overlays for nodes with cached images', () => {
    const parts: string[] = [];
    const definitions: string[] = [];
    const imageElements: string[] = [];
    const image = document.createElement('img') as HTMLImageElement;
    Object.defineProperty(image, 'naturalWidth', { value: 80 });
    Object.defineProperty(image, 'naturalHeight', { value: 60 });
    nodeHarness.getImage.mockReturnValue(image);

    const nodes: SvgExportNode[] = [{
      id: 'node-1',
      label: 'Node',
      size: 20,
      color: '#0f172a',
      borderColor: '#cbd5e1',
      borderWidth: 2,
      shape2D: 'circle',
      imageUrl: 'https://example.com/icon.png',
    }];
    const positionMap = new Map([['node-1', { x: 50, y: 60 }]]);

    appendNodeElements(parts, definitions, imageElements, nodes, positionMap, false, '#ffffff');

    expect(parts).toEqual([
      '<circle cx="50" cy="60" r="20" fill="#0f172a" stroke="#cbd5e1" stroke-width="2"/>',
    ]);
    expect(definitions).toEqual([
      '<clipPath id="clip-node_1"><circle cx="50" cy="60" r="16"/></clipPath>',
    ]);
    expect(imageElements).toEqual([
      '<image href="data:image/png;base64,encoded" x="38" y="48" width="24" height="24" clip-path="url(#clip-node_1)"/>',
    ]);
  });

  it('skips nodes without positions while still rendering later nodes', () => {
    const parts: string[] = [];
    const definitions: string[] = [];
    const imageElements: string[] = [];
    const nodes: SvgExportNode[] = [
      {
        id: 'missing',
        label: 'Missing',
        size: 10,
        color: '#111827',
        borderColor: '#e5e7eb',
        borderWidth: 1,
      },
      {
        id: 'present',
        label: 'Visible',
        size: 10,
        color: '#111827',
        borderColor: '#e5e7eb',
        borderWidth: 1,
      },
    ];
    const positionMap = new Map([['present', { x: 5, y: 6 }]]);

    appendNodeElements(parts, definitions, imageElements, nodes, positionMap, false, '#ffffff');

    expect(parts).toEqual([
      '<circle cx="5" cy="6" r="10" fill="#111827" stroke="#e5e7eb" stroke-width="1"/>',
    ]);
    expect(definitions).toEqual([]);
    expect(imageElements).toEqual([]);
  });
});
