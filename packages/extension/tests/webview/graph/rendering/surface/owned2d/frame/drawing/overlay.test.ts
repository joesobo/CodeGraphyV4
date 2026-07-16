import { describe, expect, it, vi } from 'vitest';
import type { FGNode } from '../../../../../../../../src/webview/components/graph/model/build';
import {
  drawOwnedGraphOverlay,
  type OwnedGraphDrawingOptions,
} from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/drawing/overlay';

type StackedDrawingOptions = OwnedGraphDrawingOptions & {
  hoveredNodeIndex: number;
  hoveredNodeScale: number;
  nodeIndexByRenderedIndex: Uint32Array;
};

function node(id = 'a', overrides: Partial<FGNode> = {}): FGNode {
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
    ...overrides,
  };
}

function drawingOptions(overrides: Partial<StackedDrawingOptions> = {}): StackedDrawingOptions {
  const nodes = overrides.nodes ?? [node()];
  return {
    context: {
      restore: vi.fn(),
      save: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
    } as unknown as CanvasRenderingContext2D,
    directionMode: 'none',
    getLinkParticles: vi.fn(),
    getParticleColor: vi.fn(),
    globalScale: 1,
    hoveredNodeIndex: -1,
    hoveredNodeScale: 1,
    links: [],
    nodes,
    nodeIndexByRenderedIndex: Uint32Array.from(nodes, (_node, index) => index),
    nodeLabelCanvasObject: vi.fn(),
    particleSize: 1,
    particleSpeed: 1,
    timestamp: 0,
    viewport: { minimumX: -10, maximumX: 10, minimumY: -10, maximumY: 10 },
    ...overrides,
  };
}

describe('drawOwnedGraphOverlay', () => {
  it('draws node decorations without repainting WebGPU node bodies', () => {
    const nodeLabelCanvasObject = vi.fn();

    drawOwnedGraphOverlay(drawingOptions({ nodeLabelCanvasObject }));

    expect(nodeLabelCanvasObject).toHaveBeenCalledOnce();
  });

  it('draws every Canvas decoration in the GPU node stacking order', () => {
    const largeImage = node('large-image', { imageUrl: 'large.png' });
    const hoveredBadge = node('hovered-badge', { isFavorite: true });
    const pluginOverlay = node('plugin-overlay');
    const renderedIds: string[] = [];

    drawOwnedGraphOverlay(drawingOptions({
      hoveredNodeIndex: 1,
      nodes: [largeImage, hoveredBadge, pluginOverlay],
      nodeIndexByRenderedIndex: Uint32Array.from([1, 2, 0]),
      nodeLabelCanvasObject: current => renderedIds.push(current.id),
    }));

    expect(renderedIds).toEqual(['plugin-overlay', 'large-image', 'hovered-badge']);
  });

  it('applies the GPU hover scale around the hovered node position', () => {
    const hovered = node('hovered', { x: 25, y: 30 });
    const restore = vi.fn();
    const save = vi.fn();
    const scale = vi.fn();
    const translate = vi.fn();
    const context = { restore, save, scale, translate } as unknown as CanvasRenderingContext2D;

    drawOwnedGraphOverlay(drawingOptions({
      context,
      hoveredNodeIndex: 0,
      hoveredNodeScale: 1.1,
      nodes: [hovered],
      nodeIndexByRenderedIndex: Uint32Array.from([0]),
    }));

    expect(save).toHaveBeenCalledTimes(3);
    expect(translate.mock.calls).toEqual([[25, 30], [-25, -30]]);
    expect(scale).toHaveBeenCalledWith(1.1, 1.1);
    expect(restore).toHaveBeenCalledTimes(3);
  });

  it('draws particles on authoritative edge paths before node overlays', () => {
    const events: string[] = [];
    const context = {
      arc: vi.fn(() => events.push('particle')),
      beginPath: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
      restore: vi.fn(),
      save: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const source = node('a');
    const target = node('b', { x: 100 });

    drawOwnedGraphOverlay(drawingOptions({
      context,
      directionMode: 'particles',
      getLinkParticles: () => 1,
      getParticleColor: () => '#fff',
      links: [{ source, target, id: 'a-b' } as never],
      nodes: [source, target],
      nodeIndexByRenderedIndex: Uint32Array.from([0, 1]),
      nodeLabelCanvasObject: current => events.push(current.id),
      particleSpeed: 0,
      viewport: { minimumX: 0, maximumX: 140, minimumY: 0, maximumY: 20 },
    }));

    expect(context.arc).toHaveBeenCalledWith(0, 0, 1, 0, Math.PI * 2);
    expect(events).toEqual(['particle', 'a', 'b']);
    expect([source.x, source.y, target.x, target.y]).toEqual([0, 0, 100, 0]);
  });

  it('skips particle drawing until link endpoints resolve to finite positions', () => {
    const context = {
      arc: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
      restore: vi.fn(),
      save: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const getLinkParticles = vi.fn(() => 1);

    drawOwnedGraphOverlay(drawingOptions({
      context,
      directionMode: 'particles',
      getLinkParticles,
      getParticleColor: () => '#fff',
      links: [
        { source: 'a', target: 'b', id: 'unresolved' } as never,
        { source: node(), target: node('non-finite', { x: Number.NaN }), id: 'invalid' } as never,
      ],
      nodes: [],
      nodeIndexByRenderedIndex: new Uint32Array(),
      viewport: { minimumX: 0, maximumX: 100, minimumY: 0, maximumY: 100 },
    }));

    expect(context.arc).not.toHaveBeenCalled();
    expect(getLinkParticles).not.toHaveBeenCalled();
  });

  it('draws overlays at authoritative positions without changing nodes', () => {
    const rendered: Array<{ x: number | undefined; y: number | undefined }> = [];
    const graphNode = node('positioned', { x: 25, y: 30 });

    drawOwnedGraphOverlay(drawingOptions({
      nodes: [graphNode],
      nodeIndexByRenderedIndex: Uint32Array.from([0]),
      nodeLabelCanvasObject: current => rendered.push({ x: current.x, y: current.y }),
      viewport: { minimumX: 20, maximumX: 30, minimumY: 25, maximumY: 35 },
    }));

    expect(rendered).toEqual([{ x: 25, y: 30 }]);
    expect([graphNode.x, graphNode.y]).toEqual([25, 30]);
  });

  it('draws decorations only for nodes inside the viewport margin', () => {
    const nodeLabelCanvasObject = vi.fn();
    const visible = node('visible');
    const edgeOverlay = node('edge-overlay', { x: 20 });
    const outside = node('outside', { x: 300 });

    drawOwnedGraphOverlay(drawingOptions({
      nodes: [visible, edgeOverlay, outside],
      nodeIndexByRenderedIndex: Uint32Array.from([2, 1, 0]),
      nodeLabelCanvasObject,
    }));

    expect(nodeLabelCanvasObject).toHaveBeenCalledTimes(2);
    expect(nodeLabelCanvasObject).toHaveBeenNthCalledWith(1, edgeOverlay, expect.anything(), 1);
    expect(nodeLabelCanvasObject).toHaveBeenNthCalledWith(2, visible, expect.anything(), 1);
  });
});
