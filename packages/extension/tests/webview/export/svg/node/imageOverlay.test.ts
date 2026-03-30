import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appendNodeImageOverlay } from '../../../../../src/webview/export/svg/node/imageOverlay';
import type { SvgExportNode } from '../../../../../src/webview/export/svg/contracts';

const overlayHarness = vi.hoisted(() => ({
  getImage: vi.fn(),
}));

vi.mock('../../../../../src/webview/components/graph/rendering/imageCache', () => ({
  getImage: overlayHarness.getImage,
}));

describe('exportSvgNodeImageOverlay', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const node: SvgExportNode = {
    id: 'node-1',
    label: 'Node',
    size: 20,
    color: '#0f172a',
    borderColor: '#cbd5e1',
    borderWidth: 2,
    shape2D: 'circle',
    imageUrl: 'https://example.com/icon.png',
  };

  beforeEach(() => {
    overlayHarness.getImage.mockReset();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,encoded');
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
  });

  it('does nothing when the node has no image url or cached image', () => {
    const definitions: string[] = [];
    const imageElements: string[] = [];

    appendNodeImageOverlay({ ...node, imageUrl: undefined }, { x: 50, y: 60 }, 'circle', definitions, imageElements);
    appendNodeImageOverlay(node, { x: 50, y: 60 }, 'circle', definitions, imageElements);

    expect(overlayHarness.getImage).toHaveBeenCalledTimes(1);
    expect(overlayHarness.getImage).toHaveBeenCalledWith('https://example.com/icon.png');
    expect(definitions).toEqual([]);
    expect(imageElements).toEqual([]);
  });

  it('creates clipped image overlays for cached images', () => {
    const definitions: string[] = [];
    const imageElements: string[] = [];
    const image = document.createElement('img') as HTMLImageElement;
    Object.defineProperty(image, 'naturalWidth', { value: 80 });
    Object.defineProperty(image, 'naturalHeight', { value: 60 });
    overlayHarness.getImage.mockReturnValue(image);

    appendNodeImageOverlay(node, { x: 50, y: 60 }, 'circle', definitions, imageElements);

    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png');
    expect(definitions).toEqual([
      '<clipPath id="clip-node_1"><circle cx="50" cy="60" r="16"/></clipPath>',
    ]);
    expect(imageElements).toEqual([
      '<image href="data:image/png;base64,encoded" x="38" y="48" width="24" height="24" clip-path="url(#clip-node_1)"/>',
    ]);
  });

  it('falls back to a 64px canvas dimension when the cached image has no natural size', () => {
    const definitions: string[] = [];
    const imageElements: string[] = [];
    const image = document.createElement('img') as HTMLImageElement;
    const drawImage = vi.fn();
    const getContext = vi.fn(() => ({
      drawImage,
    }));

    Object.defineProperty(image, 'naturalWidth', { value: 0 });
    Object.defineProperty(image, 'naturalHeight', { value: 0 });
    overlayHarness.getImage.mockReturnValue(image);
    HTMLCanvasElement.prototype.getContext = getContext as unknown as typeof HTMLCanvasElement.prototype.getContext;

    appendNodeImageOverlay(node, { x: 50, y: 60 }, 'circle', definitions, imageElements);

    const canvas = getContext.mock.instances[0] as unknown as HTMLCanvasElement;
    expect(canvas.width).toBe(64);
    expect(canvas.height).toBe(64);
    expect(drawImage).toHaveBeenCalledWith(image, 0, 0);
  });

  it('stops after defining the clip path when the canvas context is unavailable', () => {
    const definitions: string[] = [];
    const imageElements: string[] = [];
    const image = document.createElement('img') as HTMLImageElement;
    overlayHarness.getImage.mockReturnValue(image);
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    appendNodeImageOverlay({ ...node, id: 'node:2', shape2D: 'diamond' }, { x: 50, y: 60 }, 'diamond', definitions, imageElements);

    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
    expect(definitions).toEqual([
      '<clipPath id="clip-node_2"><path d="M50,44L66,60L50,76L34,60Z"/></clipPath>',
    ]);
    expect(imageElements).toEqual([]);
  });
});
