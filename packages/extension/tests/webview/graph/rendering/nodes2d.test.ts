import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NodeDecorationPayload } from '../../../../src/shared/plugins/decorations';
import type { ThemeKind } from '../../../../src/webview/theme/useTheme';

vi.mock('../../../../src/webview/components/graph/rendering/imageCache', () => ({
  getImage: vi.fn(),
}));

vi.mock('../../../../src/webview/components/graph/rendering/shapes/draw2d', () => ({
  drawShape: vi.fn(),
}));

import { getImage } from '../../../../src/webview/components/graph/rendering/imageCache';
import { drawShape } from '../../../../src/webview/components/graph/rendering/shapes/draw2d';
import type { WebviewPluginHost } from '../../../../src/webview/pluginHost/manager';
import type { FGNode } from '../../../../src/webview/components/graph/model/build';
import {
  paintNodePointerArea,
  renderNodeCanvas,
} from '../../../../src/webview/components/graph/rendering/nodes/canvas2d';

interface ContextOperation {
  fillStyle: string;
  globalAlpha: number;
  kind: 'drawImage' | 'fill' | 'fillText' | 'stroke';
  lineWidth: number;
  strokeStyle: string;
  text?: string;
}

function createDependencies(overrides: Partial<{
  highlightedNeighborIds: Set<string>;
  highlightedNodeId: string | null;
  nodeDecoration: NodeDecorationPayload | undefined;
  pluginHost: WebviewPluginHost | undefined;
  selectedNodeIds: Set<string>;
  showLabels: boolean;
  theme: ThemeKind;
}> = {}) {
  return {
    highlightedNeighborsRef: { current: overrides.highlightedNeighborIds ?? new Set<string>() },
    highlightedNodeRef: { current: overrides.highlightedNodeId ?? null },
    nodeDecorationsRef: {
      current: overrides.nodeDecoration
        ? { 'src/app.ts': overrides.nodeDecoration }
        : undefined,
    },
    selectedNodesSetRef: { current: overrides.selectedNodeIds ?? new Set<string>() },
    showLabelsRef: { current: overrides.showLabels ?? true },
    themeRef: { current: overrides.theme ?? 'dark' },
    pluginHost: overrides.pluginHost,
    triggerImageRerender: vi.fn(),
  };
}

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

function createContext(): {
  ctx: CanvasRenderingContext2D;
  operations: ContextOperation[];
} {
  const operations: ContextOperation[] = [];
  const ctx = {
    clip: vi.fn(),
    drawImage: vi.fn(() => {
      operations.push({
        fillStyle: ctx.fillStyle,
        globalAlpha: ctx.globalAlpha,
        kind: 'drawImage',
        lineWidth: ctx.lineWidth,
        strokeStyle: ctx.strokeStyle,
      });
    }),
    fill: vi.fn(() => {
      operations.push({
        fillStyle: ctx.fillStyle,
        globalAlpha: ctx.globalAlpha,
        kind: 'fill',
        lineWidth: ctx.lineWidth,
        strokeStyle: ctx.strokeStyle,
      });
    }),
    fillText: vi.fn((text: string) => {
      operations.push({
        fillStyle: ctx.fillStyle,
        globalAlpha: ctx.globalAlpha,
        kind: 'fillText',
        lineWidth: ctx.lineWidth,
        strokeStyle: ctx.strokeStyle,
        text,
      });
    }),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(() => {
      operations.push({
        fillStyle: ctx.fillStyle,
        globalAlpha: ctx.globalAlpha,
        kind: 'stroke',
        lineWidth: ctx.lineWidth,
        strokeStyle: ctx.strokeStyle,
      });
    }),
    fillStyle: '',
    font: '',
    globalAlpha: 1,
    lineWidth: 0,
    strokeStyle: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  };

  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    operations,
  };
}

describe('graph/rendering/nodes/canvas2d', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('draws the node body and stroke using node styling', () => {
    const { ctx, operations } = createContext();

    renderNodeCanvas(createDependencies(), createNode(), ctx, 1);

    expect(drawShape).toHaveBeenCalledWith(ctx, 'circle', 24, 48, 16);
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(operations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        globalAlpha: 1,
        kind: 'fill',
      }),
      expect.objectContaining({
        globalAlpha: 1,
        kind: 'stroke',
      }),
      expect.objectContaining({
        kind: 'fillText',
        text: 'app.ts',
      }),
    ]));
    expect(ctx.save).toHaveBeenCalledOnce();
    expect(ctx.restore).toHaveBeenCalledOnce();
  });

  it('draws an image overlay when the node image is cached', () => {
    const image = { width: 32, height: 32 };
    vi.mocked(getImage).mockReturnValue(image as HTMLImageElement);
    const { ctx, operations } = createContext();

    renderNodeCanvas(
      createDependencies(),
      createNode({ imageUrl: 'https://example.com/icon.png' }),
      ctx,
      1,
    );

    expect(getImage).toHaveBeenCalledWith('https://example.com/icon.png', expect.any(Function));
    expect(ctx.clip).toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 14.4, 38.4, 19.2, 19.2);
    expect(operations).toContainEqual(expect.objectContaining({
      globalAlpha: 1,
      kind: 'drawImage',
    }));
  });

  it('renders labels when labels are enabled and the zoom level makes them visible', () => {
    const { ctx, operations } = createContext();

    renderNodeCanvas(
      createDependencies({
        nodeDecoration: { label: { text: 'Decorated Label', color: '#facc15' } },
      }),
      createNode(),
      ctx,
      2,
    );

    expect(ctx.fillText).toHaveBeenCalledWith('Decorated Label', 24, 65);
    expect(ctx.fillStyle).toBe('#facc15');
    expect(operations).toContainEqual(expect.objectContaining({
      fillStyle: '#facc15',
      kind: 'fillText',
      text: 'Decorated Label',
    }));
  });

  it('uses the wildcard plugin renderer when no type-specific renderer is registered', () => {
    const pluginRenderer = vi.fn();
    const getNodeRenderer = vi.fn((type: string) => (type === '*' ? pluginRenderer : undefined));
    const { ctx } = createContext();

    renderNodeCanvas(
      createDependencies({
        pluginHost: { getNodeRenderer } as unknown as WebviewPluginHost,
      }),
      createNode(),
      ctx,
      1,
    );

    expect(getNodeRenderer).toHaveBeenCalledWith('.ts');
    expect(getNodeRenderer).toHaveBeenCalledWith('*');
    expect(pluginRenderer).toHaveBeenCalledWith(expect.objectContaining({
      node: expect.objectContaining({ id: 'src/app.ts' }),
      ctx,
      globalScale: 1,
    }));
  });

  it('dims disconnected nodes when another node is highlighted', () => {
    const { ctx, operations } = createContext();

    renderNodeCanvas(
      createDependencies({
        highlightedNodeId: 'src/other.ts',
        showLabels: false,
      }),
      createNode({ baseOpacity: 0.85 }),
      ctx,
      1,
    );

    expect(operations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        globalAlpha: 0.15,
        kind: 'fill',
      }),
      expect.objectContaining({
        globalAlpha: 0.15,
        kind: 'stroke',
      }),
    ]));
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('keeps decorated neighbor nodes at their decorated opacity when they are highlighted indirectly', () => {
    const { ctx, operations } = createContext();

    renderNodeCanvas(
      createDependencies({
        highlightedNeighborIds: new Set(['src/app.ts']),
        highlightedNodeId: 'src/other.ts',
        nodeDecoration: { opacity: 0.7 },
      }),
      createNode({ baseOpacity: 0.4 }),
      ctx,
      1,
    );

    expect(operations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        globalAlpha: 0.7,
        kind: 'fill',
      }),
      expect.objectContaining({
        globalAlpha: 0.7,
        kind: 'stroke',
      }),
    ]));
  });

  it('keeps directly highlighted nodes fully opaque when they have no explicit base opacity', () => {
    const { ctx, operations } = createContext();

    renderNodeCanvas(
      createDependencies({
        highlightedNodeId: 'src/app.ts',
        showLabels: false,
      }),
      createNode({ baseOpacity: undefined }),
      ctx,
      1,
    );

    expect(operations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        globalAlpha: 1,
        kind: 'fill',
      }),
      expect.objectContaining({
        globalAlpha: 1,
        kind: 'stroke',
      }),
    ]));
  });

  it('renders selected nodes with the selected border styling', () => {
    const { ctx, operations } = createContext();

    renderNodeCanvas(
      createDependencies({
        selectedNodeIds: new Set(['src/app.ts']),
        showLabels: false,
      }),
      createNode(),
      ctx,
      1,
    );

    expect(operations).toContainEqual(expect.objectContaining({
      kind: 'stroke',
      lineWidth: 3,
      strokeStyle: '#ffffff',
    }));
  });

  it('paints the expanded pointer area around the node shape', () => {
    const { ctx } = createContext();

    paintNodePointerArea(createNode(), '#ffffff', ctx);

    expect(drawShape).toHaveBeenCalledWith(ctx, 'circle', 24, 48, 18);
    expect(ctx.fillStyle).toBe('#ffffff');
    expect(ctx.fill).toHaveBeenCalled();
  });
});
