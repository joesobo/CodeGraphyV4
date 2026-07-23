import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../src/webview/components/graph/rendering/imageCache', () => ({
  getImage: vi.fn(),
}));

vi.mock('../../../../../src/webview/components/graph/rendering/shapes/draw/twoDimensional', () => ({
  drawShape: vi.fn(),
}));

import { getImage } from '../../../../../src/webview/components/graph/rendering/imageCache';
import { drawShape } from '../../../../../src/webview/components/graph/rendering/shapes/draw/twoDimensional';
import type { WebviewPluginHost } from '../../../../../src/webview/pluginHost/manager';
import type { FGNode } from '../../../../../src/webview/components/graph/model/build';
import { renderNodeImageOverlay, renderNodePluginOverlay } from '../../../../../src/webview/components/graph/rendering/node/media';

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

describe('graph/rendering/node/media', () => {
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
    vi.mocked(getImage).mockReturnValue(null);
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
    const getNodeRenderers = vi.fn(() => []);
    const ctx = createContext();

    renderNodePluginOverlay(
      { getNodeRenderers } as unknown as WebviewPluginHost,
      createNode(),
      ctx,
      1,
      undefined,
    );

    expect(getNodeRenderers).toHaveBeenCalledWith('.ts');
  });

  it('runs type-specific and wildcard plugin renderers when both are registered', () => {
    const typeRenderer = vi.fn();
    const wildcardRenderer = vi.fn();
    const getNodeRenderers = vi.fn(() => [typeRenderer, wildcardRenderer]);
    const ctx = createContext();

    renderNodePluginOverlay(
      { getNodeRenderers } as unknown as WebviewPluginHost,
      createNode(),
      ctx,
      1,
      undefined,
    );

    expect(getNodeRenderers).toHaveBeenCalledWith('.ts');
    expect(typeRenderer).toHaveBeenCalledWith(expect.objectContaining({
      node: expect.objectContaining({ id: 'src/app.ts' }),
      canvasContext: ctx,
      globalScale: 1,
    }));
    expect(wildcardRenderer).toHaveBeenCalledWith(expect.objectContaining({
      node: expect.objectContaining({ id: 'src/app.ts' }),
      canvasContext: ctx,
      globalScale: 1,
    }));
    expect(ctx.save).toHaveBeenCalledTimes(2);
    expect(ctx.restore).toHaveBeenCalledTimes(2);
  });

  it('restores Canvas state and continues after a plugin renderer error', () => {
    const error = new Error('boom');
    const failedRenderer = vi.fn(({ canvasContext }: { canvasContext: CanvasRenderingContext2D }) => {
      canvasContext.globalAlpha = 0.2;
      throw error;
    });
    const healthyRenderer = vi.fn();
    const getNodeRenderers = vi.fn(() => [failedRenderer, healthyRenderer]);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ctx = createContext();

    renderNodePluginOverlay(
      { getNodeRenderers } as unknown as WebviewPluginHost,
      createNode(),
      ctx,
      1,
      undefined,
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith('[CodeGraphy] Plugin node renderer error:', error);
    expect(healthyRenderer).toHaveBeenCalledOnce();
    expect(ctx.save).toHaveBeenCalledTimes(2);
    expect(ctx.restore).toHaveBeenCalledTimes(2);

    consoleErrorSpy.mockRestore();
  });
});
