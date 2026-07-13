import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NodeDecorationPayload } from '../../../../../src/shared/plugins/decorations';
import type { WebviewPluginHost } from '../../../../../src/webview/pluginHost/manager';
import type { FGNode } from '../../../../../src/webview/components/graph/model/build';
import type { NodeLabelSpriteProvider } from '../../../../../src/webview/components/graph/rendering/node/labelSprite';
import { DEFAULT_GRAPH_APPEARANCE } from '../../../../../src/webview/components/graph/appearance/model';
import {
  getNodeCanvasStyle,
  renderNodeCanvasLabel,
} from '../../../../../src/webview/components/graph/rendering/nodes/canvas2d';

function createDependencies(overrides: Partial<{
  highlightedNodeId: string | null;
  nodeDecoration: NodeDecorationPayload;
  pluginHost: WebviewPluginHost;
  selectedNodeIds: Set<string>;
  showLabels: boolean;
}> = {}) {
  return {
    graphAppearanceRef: { current: DEFAULT_GRAPH_APPEARANCE },
    highlightedNeighborsRef: { current: new Set<string>() },
    highlightedNodeRef: { current: overrides.highlightedNodeId ?? null },
    nodeDecorationsRef: {
      current: overrides.nodeDecoration
        ? { 'src/app.ts': overrides.nodeDecoration }
        : undefined,
    },
    selectedNodesSetRef: { current: overrides.selectedNodeIds ?? new Set<string>() },
    showLabelsRef: { current: overrides.showLabels ?? true },
    themeRef: { current: 'dark' as const },
    pluginHost: overrides.pluginHost,
    triggerImageRerender: vi.fn(),
  };
}

function createNode(overrides: Partial<FGNode> = {}): FGNode {
  return {
    baseOpacity: 1,
    borderColor: '#1d4ed8',
    borderWidth: 2,
    color: '#3b82f6',
    id: 'src/app.ts',
    isFavorite: false,
    label: 'app.ts',
    nodeType: 'file',
    size: 16,
    x: 24,
    y: 48,
    ...overrides,
  } as FGNode;
}

function createContext(): CanvasRenderingContext2D {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clip: vi.fn(),
    closePath: vi.fn(),
    drawImage: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    rect: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    fillStyle: '',
    font: '',
    globalAlpha: 1,
    lineWidth: 0,
    strokeStyle: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D;
}

const labelSpriteCache = {
  get: () => ({ cssHeight: 15, cssWidth: 26, image: {} as CanvasImageSource }),
} satisfies NodeLabelSpriteProvider;

describe('graph/rendering/nodes/canvas2d', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('produces the active WebGPU style from selection and decoration state', () => {
    const style = getNodeCanvasStyle(
      createDependencies({
        nodeDecoration: { color: '#f97316', opacity: 0.7 },
        selectedNodeIds: new Set(['src/app.ts']),
      }),
      createNode({
        cornerRadius2D: 6,
        fillOpacity2D: 0.5,
        shape2D: 'rectangle',
        shapeSize2D: { height: 12, width: 30 },
      }),
    );

    expect(style).toMatchObject({
      borderColor: DEFAULT_GRAPH_APPEARANCE.nodeSelectionBorder,
      borderWidth: 3,
      cornerRadius: 6,
      fillColor: '#f97316',
      fillOpacity: 0.5,
      height: 12,
      opacity: 0.7,
      shape: 'rectangle',
      width: 30,
    });
  });

  it('mutes nodes outside the highlighted neighborhood', () => {
    const style = getNodeCanvasStyle(
      createDependencies({ highlightedNodeId: 'src/other.ts' }),
      createNode({ baseOpacity: 0.8 }),
    );

    expect(style.opacity).toBe(0.15);
  });

  it('draws active Canvas overlays and honors the label toggle', () => {
    const context = createContext();
    const node = createNode();

    renderNodeCanvasLabel(createDependencies(), node, context, 1, labelSpriteCache);
    expect(context.drawImage).toHaveBeenCalled();
    expect(context.save).toHaveBeenCalledOnce();
    expect(context.restore).toHaveBeenCalledOnce();

    vi.mocked(context.drawImage).mockClear();
    renderNodeCanvasLabel(
      createDependencies({ showLabels: false }),
      node,
      context,
      1,
      labelSpriteCache,
    );
    expect(context.drawImage).not.toHaveBeenCalled();
  });
});
