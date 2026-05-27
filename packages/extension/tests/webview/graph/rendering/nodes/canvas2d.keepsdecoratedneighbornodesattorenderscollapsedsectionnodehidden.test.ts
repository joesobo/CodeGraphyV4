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
import {
  renderNodeCanvas
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



    it('renders a pin badge for pinned nodes without changing the node body', () => {
      const { ctx, operations } = createContext();
      vi.stubGlobal('Path2D', vi.fn());

      renderNodeCanvas(
        createDependencies({ showLabels: false }),
        createNode({ isPinned: true }),
        ctx,
        1,
      );

      expect(drawShape).toHaveBeenCalledWith(ctx, 'circle', 24, 48, 16);
      expect(ctx.arc).not.toHaveBeenCalled();
      expect(ctx.translate).toHaveBeenCalledWith(
        expect.closeTo(29.775),
        expect.closeTo(31.375),
      );
      expect(ctx.scale).toHaveBeenCalledWith(0.45208333333333334, 0.45208333333333334);
      expect(ctx.fill).toHaveBeenCalledWith(expect.anything());
      expect(operations).not.toContainEqual(expect.objectContaining({
        fillStyle: 'rgb(28, 62, 118)',
      }));
      expect(operations).toContainEqual(expect.objectContaining({
        fillStyle: '#ffffff',
        kind: 'fill',
      }));
    });



    it('skips expanded Section Nodes because the editable Section Frame follows the live node position', () => {
      const { ctx } = createContext();

      renderNodeCanvas(
        createDependencies({ showLabels: false }),
        createNode({
          borderColor: '#60a5fa',
          color: '#60a5fa',
          id: 'section-1',
          isGraphSection: true,
          label: 'UI Layer',
          nodeType: 'graph-section',
          sectionHeight: 180,
          sectionWidth: 280,
          shape2D: 'square',
          x: 100,
          y: 120,
        }),
        ctx,
        1,
      );

      expect(drawShape).not.toHaveBeenCalled();
      expect(ctx.fill).not.toHaveBeenCalled();
      expect(ctx.stroke).not.toHaveBeenCalled();
    });



    it('renders collapsed Section Nodes as rounded Graph Section squares', () => {
      const { ctx } = createContext();

      renderNodeCanvas(
        createDependencies({ showLabels: false }),
        createNode({
          id: 'section-1',
          isCollapsedGraphSection: true,
          isGraphSection: true,
          nodeType: 'graph-section',
          shape2D: 'square',
        }),
        ctx,
        1,
      );

      expect(drawShape).not.toHaveBeenCalled();
      expect(ctx.quadraticCurveTo).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });



    it('renders collapsed Section Node hidden counts in the bottom right and expand cue in the top left', () => {
      const { ctx, operations } = createContext();
      vi.stubGlobal('Path2D', vi.fn());

      renderNodeCanvas(
        createDependencies({ showLabels: false }),
        createNode({
          id: 'section-1',
          hiddenDescendantCount: 4,
          isCollapsedGraphSection: true,
          isGraphSection: true,
          isPinned: true,
          nodeType: 'graph-section',
          shape2D: 'square',
        }),
        ctx,
        1,
      );

      expect(ctx.arc).not.toHaveBeenCalled();
      expect(ctx.translate).toHaveBeenCalledWith(expect.closeTo(7.2), expect.closeTo(31.2));
      expect(ctx.fillText).toHaveBeenCalledWith('4', 35.2, 59.2);
      expect(operations).toContainEqual(expect.objectContaining({
        kind: 'fillText',
        text: '4',
      }));
    });
});
