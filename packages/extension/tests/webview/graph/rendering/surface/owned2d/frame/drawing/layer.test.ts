import { describe, expect, it, vi } from 'vitest';
import type { FGNode } from '../../../../../../../../src/webview/components/graph/model/build';
import {
  drawOwnedDecorationLayer,
  type PreparedOverlayCanvas,
} from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/drawing/layer';
import type { OwnedGraphFrameRuntime } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/runtime/render';
import type { OwnedGraphLayout } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout/runtime/model';

function node(id: string): FGNode {
  return {
    id,
    label: id,
    size: 4,
    color: '#fff',
    borderColor: '#000',
    borderWidth: 1,
    baseOpacity: 1,
    isFavorite: false,
    isPinned: false,
    x: 0,
    y: 0,
  };
}

describe('owned graph decoration layer stacking', () => {
  it('uses the renderer stacking algorithm and current hover state', () => {
    const large = node('large');
    const hoveredSmall = node('hovered-small');
    const medium = node('medium');
    const nodes = [large, hoveredSmall, medium];
    const renderedIds: string[] = [];
    const scale = vi.fn();
    const context = {
      clearRect: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      scale,
      setTransform: vi.fn(),
      translate: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const prepared: PreparedOverlayCanvas = {
      context,
      devicePixelRatio: 1,
      height: 100,
      width: 100,
    };
    const runtime = {
      cameraRef: { current: { centerX: 0, centerY: 0, zoom: 2 } },
      nodeHoverRef: {
        current: { nodeId: hoveredSmall.id, scale: 1.1, transition: null },
      },
      propsRef: {
        current: {
          directionMode: 'none',
          getLinkParticles: vi.fn(),
          getNodeStyle: (current: FGNode) => {
            const size = current === large ? 30 : current === medium ? 20 : 10;
            return {
              borderColor: '#000',
              borderWidth: 1,
              cornerRadius: 0,
              fillColor: '#fff',
              fillOpacity: 1,
              height: size,
              opacity: 1,
              shape: 'circle' as const,
              width: size,
            };
          },
          getParticleColor: vi.fn(),
          getStyleRevision: () => 7,
          nodeLabelCanvasObject: (current: FGNode) => renderedIds.push(current.id),
          onRenderFramePost: vi.fn(),
          particleSize: 1,
          particleSpeed: 1,
        },
      },
    } as unknown as OwnedGraphFrameRuntime;
    const layout = {
      engine: { getNodeIndex: (id: string) => nodes.findIndex(current => current.id === id) },
      links: [],
      nodes,
    } as unknown as OwnedGraphLayout;

    drawOwnedDecorationLayer(runtime, layout, prepared, 0, true);

    expect(renderedIds).toEqual(['medium', 'large', 'hovered-small']);
    expect(scale).toHaveBeenCalledWith(2, 2);
    expect(scale).toHaveBeenCalledWith(1.1, 1.1);
  });

  it('isolates a failing node decoration and restores Canvas state before continuing', () => {
    const nodes = [node('bad'), node('good')];
    const renderedIds: string[] = [];
    const context = {
      restore: vi.fn(), save: vi.fn(), scale: vi.fn(), translate: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const runtime = {
      cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
      nodeHoverRef: { current: { nodeId: null, scale: 1, transition: null } },
      propsRef: { current: {
        directionMode: 'none', getLinkParticles: vi.fn(),
        getNodeStyle: () => ({
          borderColor: '#000', borderWidth: 1, cornerRadius: 0, fillColor: '#fff',
          fillOpacity: 1, height: 10, opacity: 1, shape: 'circle' as const, width: 10,
        }),
        getParticleColor: vi.fn(), getStyleRevision: () => 1,
        nodeLabelCanvasObject: (current: FGNode) => {
          if (current.id === 'bad') throw new Error('bad decoration');
          renderedIds.push(current.id);
        },
        onRenderFramePost: vi.fn(), particleSize: 1, particleSpeed: 1,
      } },
    } as unknown as OwnedGraphFrameRuntime;
    const layout = { engine: {}, links: [], nodes } as unknown as OwnedGraphLayout;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    drawOwnedDecorationLayer(runtime, layout, {
      context, devicePixelRatio: 1, height: 100, width: 100,
    }, 0, true);

    expect(renderedIds).toEqual(['good']);
    expect(context.save).toHaveBeenCalledTimes(5);
    expect(context.restore).toHaveBeenCalledTimes(5);
    expect(consoleError).toHaveBeenCalledWith(
      '[CodeGraphy] Graph node bad decoration failed:',
      expect.any(Error),
    );
  });

  it('reuses stacking until the renderer style revision changes', () => {
    const nodes = [node('large'), node('small')];
    let styleRevision = 1;
    const getNodeStyle = vi.fn((current: FGNode) => {
      const large = styleRevision === 1 ? current === nodes[0] : current === nodes[1];
      const size = large ? 20 : 10;
      return {
        borderColor: '#000', borderWidth: 1, cornerRadius: 0, fillColor: '#fff',
        fillOpacity: 1, height: size, opacity: 1, shape: 'circle' as const, width: size,
      };
    });
    const renderedIds: string[] = [];
    const context = {
      restore: vi.fn(), save: vi.fn(), scale: vi.fn(), translate: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const runtime = {
      cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
      nodeHoverRef: { current: { nodeId: null, scale: 1, transition: null } },
      propsRef: { current: {
        directionMode: 'none', getLinkParticles: vi.fn(), getNodeStyle,
        getParticleColor: vi.fn(), getStyleRevision: () => styleRevision,
        nodeLabelCanvasObject: (current: FGNode) => renderedIds.push(current.id),
        onRenderFramePost: vi.fn(), particleSize: 1, particleSpeed: 1,
      } },
    } as unknown as OwnedGraphFrameRuntime;
    const layout = { engine: {}, links: [], nodes } as unknown as OwnedGraphLayout;
    const prepared = { context, devicePixelRatio: 1, height: 100, width: 100 };

    drawOwnedDecorationLayer(runtime, layout, prepared, 0, true);
    drawOwnedDecorationLayer(runtime, layout, prepared, 1, true);
    expect(getNodeStyle).toHaveBeenCalledTimes(2);
    expect(renderedIds).toEqual(['small', 'large', 'small', 'large']);

    styleRevision = 2;
    renderedIds.length = 0;
    drawOwnedDecorationLayer(runtime, layout, prepared, 2, true);
    expect(getNodeStyle).toHaveBeenCalledTimes(4);
    expect(renderedIds).toEqual(['large', 'small']);
  });

  it('does not evaluate node styles when the GPU frame was not rendered', () => {
    const getNodeStyle = vi.fn();
    const context = {
      restore: vi.fn(),
      save: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const runtime = {
      cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
      nodeHoverRef: { current: { nodeId: null, scale: 1, transition: null } },
      propsRef: {
        current: {
          getNodeStyle,
          getStyleRevision: () => 1,
          onRenderFramePost: vi.fn(),
        },
      },
    } as unknown as OwnedGraphFrameRuntime;
    const layout = { engine: {}, links: [], nodes: [node('a')] } as unknown as OwnedGraphLayout;

    drawOwnedDecorationLayer(runtime, layout, {
      context,
      devicePixelRatio: 1,
      height: 100,
      width: 100,
    }, 0, false);

    expect(getNodeStyle).not.toHaveBeenCalled();
  });
});
