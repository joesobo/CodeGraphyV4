import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NodeDecorationPayload } from '../../../../../src/shared/plugins/decorations';
import type { ThemeKind } from '../../../../../src/webview/theme/useTheme';

vi.mock('../../../../../src/webview/components/graph/rendering/imageCache', () => ({
  getImage: vi.fn(),
}));

vi.mock('../../../../../src/webview/components/graph/rendering/shapes/draw/twoDimensional', () => ({
  drawShape: vi.fn(),
}));

import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../../../../src/webview/components/graph/appearance/model';
import type { FGNode } from '../../../../../src/webview/components/graph/model/build';
import { getImage } from '../../../../../src/webview/components/graph/rendering/imageCache';
import {
  paintNodePointerArea,
  renderNodeCanvas,
} from '../../../../../src/webview/components/graph/rendering/nodes/canvas2d';
import { drawShape } from '../../../../../src/webview/components/graph/rendering/shapes/draw/twoDimensional';
import type { WebviewPluginHost } from '../../../../../src/webview/pluginHost/manager';

interface ContextOperation {
  fillStyle: string;
  globalAlpha: number;
  kind: 'drawImage' | 'fill' | 'fillText' | 'stroke';
  lineWidth: number;
  strokeStyle: string;
  text?: string;
}

const TEST_GRAPH_APPEARANCE: GraphAppearance = {
  ...DEFAULT_GRAPH_APPEARANCE,
  labelForeground: '#ffffff',
  labelMutedForeground: '#a1a1aa',
  nodeSelectionBorder: '#ffffff',
};

function createDependencies(overrides: Partial<{
  graphAppearance: GraphAppearance;
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
    graphAppearanceRef: { current: overrides.graphAppearance ?? TEST_GRAPH_APPEARANCE },
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
    nodeType: 'file',
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
    arc: vi.fn(),
    beginPath: vi.fn(),
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
    closePath: vi.fn(),
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
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    rect: vi.fn(),
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
    translate: vi.fn(),
    scale: vi.fn(),
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



    afterEach(() => {
      vi.unstubAllGlobals();
    });



    it('renders collapsed Section Node icons fully opaque above the section color', () => {
      const { ctx, operations } = createContext();
      vi.mocked(getImage).mockReturnValue({} as HTMLImageElement);

      renderNodeCanvas(
        createDependencies({ showLabels: false }),
        createNode({
          baseOpacity: 0.35,
          color: '#ef4444',
          icon: 'data:image/png;base64,abc123',
          id: 'section-1',
          isCollapsedGraphSection: true,
          isGraphSection: true,
          nodeType: 'graph-section',
          shape2D: 'square',
        }),
        ctx,
        1,
      );

      expect(operations).toContainEqual(expect.objectContaining({
        globalAlpha: 1,
        kind: 'drawImage',
      }));
    });



    it('paints the expanded pointer area around the node shape', () => {
      const { ctx } = createContext();

      paintNodePointerArea(createNode(), '#ffffff', ctx);

      expect(drawShape).toHaveBeenCalledWith(ctx, 'circle', 24, 48, 18);
      expect(ctx.fillStyle).toBe('#ffffff');
      expect(ctx.fill).toHaveBeenCalled();
    });



    it('skips expanded Section Node pointer areas so member nodes stay clickable', () => {
      const { ctx } = createContext();

      paintNodePointerArea(
        createNode({
          id: 'section-1',
          isGraphSection: true,
          nodeType: 'graph-section',
          sectionHeight: 180,
          sectionWidth: 280,
          x: 100,
          y: 120,
        }),
        '#ffffff',
        ctx,
      );

      expect(drawShape).not.toHaveBeenCalled();
      expect(ctx.rect).not.toHaveBeenCalled();
      expect(ctx.fill).not.toHaveBeenCalled();
    });
});
