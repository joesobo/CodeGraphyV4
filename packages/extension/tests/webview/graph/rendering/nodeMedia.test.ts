import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/webview/lib/imageCache', () => ({
  getImage: vi.fn(),
}));

vi.mock('../../../../src/webview/lib/shapes2D', () => ({
  drawShape: vi.fn(),
}));

import { getImage } from '../../../../src/webview/lib/imageCache';
import { drawShape } from '../../../../src/webview/lib/shapes2D';
import type { WebviewPluginHost } from '../../../../src/webview/pluginHost';
import type { FGNode } from '../../../../src/webview/components/graphModel';
import { renderNodeImageOverlay, renderNodePluginOverlay } from '../../../../src/webview/components/graph/rendering/nodeMedia';

function createNode(overrides: Partial<FGNode> = {}): FGNode {
  return {
    id: 'src/app.ts',
    label: 'app.ts',
    size: 16,
    color: '#3b82f6',
    borderColor: '#1d4ed8',
    borderWidth: 2,
    baseOpacity: 1,
    isFavorite: false,
    x: 24,
    y: 48,
    ...overrides,
  } as FGNode;
}

function createContext(): CanvasRenderingContext2D {
  return {
    clip: vi.fn(),
    drawImage: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('graph/rendering/nodeMedia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips image overlay rendering when the node has no image url', () => {
    const ctx = createContext();
    const triggerImageRerender = vi.fn();

    renderNodeImageOverlay(ctx, createNode(), triggerImageRerender);

    expect(getImage).not.toHaveBeenCalled();
    expect(drawShape).not.toHaveBeenCalled();
    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it('stops image overlay rendering when the image is not yet cached', () => {
    vi.mocked(getImage).mockReturnValue(undefined);
    const ctx = createContext();
    const triggerImageRerender = vi.fn();

    renderNodeImageOverlay(
      ctx,
      createNode({ imageUrl: 'https://example.com/icon.png' }),
      triggerImageRerender,
    );

    expect(getImage).toHaveBeenCalledWith('https://example.com/icon.png', triggerImageRerender);
    expect(drawShape).not.toHaveBeenCalled();
    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it('draws an image overlay when the node image is cached', () => {
    const image = { width: 32, height: 32 };
    vi.mocked(getImage).mockReturnValue(image as HTMLImageElement);
    const ctx = createContext();

    renderNodeImageOverlay(ctx, createNode({ imageUrl: 'https://example.com/icon.png' }), vi.fn());

    expect(getImage).toHaveBeenCalledWith('https://example.com/icon.png', expect.any(Function));
    expect(drawShape).toHaveBeenCalledWith(ctx, 'circle', 24, 48, 12.8);
    expect(ctx.clip).toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 14.4, 38.4, 19.2, 19.2);
  });

  it('skips plugin overlay rendering when no plugin host is available', () => {
    renderNodePluginOverlay(undefined, createNode(), createContext(), 1, undefined);
  });

  it('skips plugin overlay rendering when no node renderer is registered', () => {
    const getNodeRenderer = vi.fn(() => undefined);
    const ctx = createContext();

    renderNodePluginOverlay(
      { getNodeRenderer } as unknown as WebviewPluginHost,
      createNode(),
      ctx,
      1,
      undefined,
    );

    expect(getNodeRenderer).toHaveBeenCalledWith('.ts');
    expect(getNodeRenderer).toHaveBeenCalledWith('*');
  });

  it('uses the wildcard plugin renderer when no type-specific renderer is registered', () => {
    const pluginRenderer = vi.fn();
    const getNodeRenderer = vi.fn((type: string) => (type === '*' ? pluginRenderer : undefined));
    const ctx = createContext();

    renderNodePluginOverlay(
      { getNodeRenderer } as unknown as WebviewPluginHost,
      createNode(),
      ctx,
      1,
      undefined,
    );

    expect(getNodeRenderer).toHaveBeenCalledWith('.ts');
    expect(getNodeRenderer).toHaveBeenCalledWith('*');
    expect(pluginRenderer).toHaveBeenCalledWith(expect.objectContaining({
      node: expect.objectContaining({ id: 'src/app.ts' }),
      ctx,
      globalScale: 1,
    }));
  });

  it('swallows plugin renderer errors after logging them', () => {
    const error = new Error('boom');
    const pluginRenderer = vi.fn(() => {
      throw error;
    });
    const getNodeRenderer = vi.fn(() => pluginRenderer);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderNodePluginOverlay(
      { getNodeRenderer } as unknown as WebviewPluginHost,
      createNode(),
      createContext(),
      1,
      undefined,
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith('[CodeGraphy] Plugin node renderer error:', error);

    consoleErrorSpy.mockRestore();
  });
});
