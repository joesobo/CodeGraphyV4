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
