import { describe, expect, it, vi } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import { drawOwnedGraphOverlay } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/drawing';

function node(): FGNode {
  return {
    id: 'a',
    label: 'a',
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

describe('drawOwnedGraphOverlay', () => {
  it('draws node decorations without repainting WebGPU node bodies', () => {
    const nodeLabelCanvasObject = vi.fn();
    const context = {} as CanvasRenderingContext2D;

    drawOwnedGraphOverlay({
      context,
      directionMode: 'none',
      getLinkParticles: vi.fn(),
      getParticleColor: vi.fn(),
      globalScale: 1,
      links: [],
      nodes: [node()],
      nodeLabelCanvasObject,
      particleSize: 1,
      particleSpeed: 1,
      timestamp: 0,
      viewport: { minimumX: -10, maximumX: 10, minimumY: -10, maximumY: 10 },
    });

    expect(nodeLabelCanvasObject).toHaveBeenCalledOnce();
  });

  it('draws particles on authoritative edge paths', () => {
    const context = {
      arc: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;
    const source = node();
    const target = { ...node(), id: 'b', x: 100 };

    drawOwnedGraphOverlay({
      context,
      directionMode: 'particles',
      getLinkParticles: () => 1,
      getParticleColor: () => '#fff',
      globalScale: 1,
      links: [{ source, target, id: 'a-b' } as never],
      nodes: [source, target],
      nodeLabelCanvasObject: vi.fn(),
      particleSize: 1,
      particleSpeed: 0,
      timestamp: 0,
      viewport: { minimumX: 0, maximumX: 140, minimumY: 0, maximumY: 20 },
    });

    expect(context.arc).toHaveBeenCalledWith(0, 0, 1, 0, Math.PI * 2);
    expect([source.x, source.y, target.x, target.y]).toEqual([0, 0, 100, 0]);
  });

  it('skips particle drawing until link endpoints resolve to finite positions', () => {
    const context = {
      arc: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;
    const getLinkParticles = vi.fn(() => 1);

    drawOwnedGraphOverlay({
      context,
      directionMode: 'particles',
      getLinkParticles,
      getParticleColor: () => '#fff',
      globalScale: 1,
      links: [
        { source: 'a', target: 'b', id: 'unresolved' } as never,
        { source: node(), target: { ...node(), id: 'non-finite', x: Number.NaN }, id: 'invalid' } as never,
      ],
      nodes: [],
      nodeLabelCanvasObject: vi.fn(),
      particleSize: 1,
      particleSpeed: 1,
      timestamp: 0,
      viewport: { minimumX: 0, maximumX: 100, minimumY: 0, maximumY: 100 },
    });

    expect(context.arc).not.toHaveBeenCalled();
    expect(getLinkParticles).not.toHaveBeenCalled();
  });

  it('draws overlays at authoritative positions without changing nodes', () => {
    const rendered: Array<{ x: number | undefined; y: number | undefined }> = [];
    const graphNode = { ...node(), x: 25, y: 30 };

    drawOwnedGraphOverlay({
      context: {} as CanvasRenderingContext2D,
      directionMode: 'none',
      getLinkParticles: vi.fn(),
      getParticleColor: vi.fn(),
      globalScale: 1,
      links: [],
      nodes: [graphNode],
      nodeLabelCanvasObject: current => rendered.push({ x: current.x, y: current.y }),
      particleSize: 1,
      particleSpeed: 1,
      timestamp: 0,
      viewport: { minimumX: 20, maximumX: 30, minimumY: 25, maximumY: 35 },
    });

    expect(rendered).toEqual([{ x: 25, y: 30 }]);
    expect([graphNode.x, graphNode.y]).toEqual([25, 30]);
  });

  it('draws decorations only for nodes inside the viewport', () => {
    const nodeLabelCanvasObject = vi.fn();
    const visible = node();
    const edgeOverlay = { ...node(), id: 'edge-overlay', x: 20 };
    const outside = { ...node(), id: 'outside', x: 300 };

    drawOwnedGraphOverlay({
      context: {} as CanvasRenderingContext2D,
      directionMode: 'none',
      getLinkParticles: vi.fn(),
      getParticleColor: vi.fn(),
      globalScale: 1,
      links: [],
      nodes: [visible, edgeOverlay, outside],
      nodeLabelCanvasObject,
      particleSize: 1,
      particleSpeed: 1,
      timestamp: 0,
      viewport: { minimumX: -10, maximumX: 10, minimumY: -10, maximumY: 10 },
    });

    expect(nodeLabelCanvasObject).toHaveBeenCalledTimes(2);
    expect(nodeLabelCanvasObject).toHaveBeenCalledWith(visible, expect.anything(), 1);
    expect(nodeLabelCanvasObject).toHaveBeenCalledWith(edgeOverlay, expect.anything(), 1);
  });
});
