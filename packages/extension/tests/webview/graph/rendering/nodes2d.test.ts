import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NodeDecorationPayload } from '../../../../src/shared/types';
import type { ThemeKind } from '../../../../src/webview/hooks/useTheme';

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
import {
  paintNodePointerArea,
  renderNodeCanvas,
} from '../../../../src/webview/components/graph/rendering/nodes2d';

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

function createContext(): CanvasRenderingContext2D {
  return {
    clip: vi.fn(),
    drawImage: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    font: '',
    globalAlpha: 1,
    lineWidth: 0,
    strokeStyle: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D;
}

describe('graph/rendering/nodes2d', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('draws the node body and stroke using node styling', () => {
    const ctx = createContext();

    renderNodeCanvas(createDependencies(), createNode(), ctx, 1);

    expect(drawShape).toHaveBeenCalledWith(ctx, 'circle', 24, 48, 16);
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('draws an image overlay when the node image is cached', () => {
    const image = { width: 32, height: 32 };
    vi.mocked(getImage).mockReturnValue(image as HTMLImageElement);
    const ctx = createContext();

    renderNodeCanvas(
      createDependencies(),
      createNode({ imageUrl: 'https://example.com/icon.png' }),
      ctx,
      1,
    );

    expect(getImage).toHaveBeenCalledWith('https://example.com/icon.png', expect.any(Function));
    expect(ctx.clip).toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 14.4, 38.4, 19.2, 19.2);
  });

  it('renders labels when labels are enabled and the zoom level makes them visible', () => {
    const ctx = createContext();

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
  });

  it('uses the wildcard plugin renderer when no type-specific renderer is registered', () => {
    const pluginRenderer = vi.fn();
    const getNodeRenderer = vi.fn((type: string) => (type === '*' ? pluginRenderer : undefined));
    const ctx = createContext();

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

  it('paints the expanded pointer area around the node shape', () => {
    const ctx = createContext();

    paintNodePointerArea(createNode(), '#ffffff', ctx);

    expect(drawShape).toHaveBeenCalledWith(ctx, 'circle', 24, 48, 18);
    expect(ctx.fillStyle).toBe('#ffffff');
    expect(ctx.fill).toHaveBeenCalled();
  });
});
