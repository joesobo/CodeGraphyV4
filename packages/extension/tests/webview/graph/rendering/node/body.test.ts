import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NodeDecorationPayload } from '../../../../../src/shared/plugins/decorations';

vi.mock('../../../../../src/webview/components/graph/rendering/shapes/draw/twoDimensional', () => ({
  drawShape: vi.fn(),
}));

import { drawShape } from '../../../../../src/webview/components/graph/rendering/shapes/draw/twoDimensional';
import type { FGNode } from '../../../../../src/webview/components/graph/model/build';
import { renderNodeBody } from '../../../../../src/webview/components/graph/rendering/node/body';
import { renderNodeLabel } from '../../../../../src/webview/components/graph/rendering/node/label';

interface ContextOperation {
  fillStyle: string;
  font: string;
  globalAlpha: number;
  kind: 'fill' | 'fillText' | 'stroke';
  lineWidth: number;
  strokeStyle: string;
  text?: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  x?: number;
  y?: number;
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

function createDecoration(overrides: Partial<NodeDecorationPayload> = {}): NodeDecorationPayload {
  return {
    ...overrides,
  };
}

function createContext(): {
  ctx: CanvasRenderingContext2D;
  operations: ContextOperation[];
} {
  const operations: ContextOperation[] = [];
  const ctx = {
    fill: vi.fn(() => {
      operations.push({
        fillStyle: ctx.fillStyle,
        font: ctx.font,
        globalAlpha: ctx.globalAlpha,
        kind: 'fill',
        lineWidth: ctx.lineWidth,
        strokeStyle: ctx.strokeStyle,
        textAlign: ctx.textAlign as CanvasTextAlign,
        textBaseline: ctx.textBaseline as CanvasTextBaseline,
      });
    }),
    fillText: vi.fn((text: string, x: number, y: number) => {
      operations.push({
        fillStyle: ctx.fillStyle,
        font: ctx.font,
        globalAlpha: ctx.globalAlpha,
        kind: 'fillText',
        lineWidth: ctx.lineWidth,
        strokeStyle: ctx.strokeStyle,
        text,
        textAlign: ctx.textAlign as CanvasTextAlign,
        textBaseline: ctx.textBaseline as CanvasTextBaseline,
        x,
        y,
      });
    }),
    stroke: vi.fn(() => {
      operations.push({
        fillStyle: ctx.fillStyle,
        font: ctx.font,
        globalAlpha: ctx.globalAlpha,
        kind: 'stroke',
        lineWidth: ctx.lineWidth,
        strokeStyle: ctx.strokeStyle,
        textAlign: ctx.textAlign as CanvasTextAlign,
        textBaseline: ctx.textBaseline as CanvasTextBaseline,
      });
    }),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    fillStyle: '',
    font: '',
    globalAlpha: 1,
    lineWidth: 0,
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    strokeStyle: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
  };

  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    operations,
  };
}

describe('graph/rendering/node/body', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('draws the node body and stroke using node styling', () => {
    const { ctx, operations } = createContext();

    renderNodeBody({
      ctx,
      node: createNode(),
      globalScale: 1,
      decoration: undefined,
      opacity: 1,
      isSelected: false,
    });

    expect(drawShape).toHaveBeenCalledWith(ctx, 'circle', 24, 48, 16);
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(operations).toEqual([
      expect.objectContaining({
        fillStyle: '#3b82f6',
        globalAlpha: 1,
        kind: 'fill',
      }),
      expect.objectContaining({
        globalAlpha: 1,
        kind: 'stroke',
        lineWidth: 2,
        strokeStyle: '#1d4ed8',
      }),
    ]);
  });

  it('draws sized rectangle node bodies from plugin presentation data', () => {
    const { ctx } = createContext();

    renderNodeBody({
      ctx,
      node: createNode({
        shape2D: 'rectangle',
        shapeSize2D: {
          height: 80,
          width: 120,
        },
      }),
      globalScale: 1,
      decoration: undefined,
      opacity: 1,
      isSelected: false,
    });

    expect(drawShape).toHaveBeenCalledWith(ctx, 'rectangle', 24, 48, 16, {
      height: 80,
      width: 120,
    });
  });

  it('passes plugin rectangle corner radius through to the shape renderer', () => {
    const { ctx } = createContext();

    renderNodeBody({
      ctx,
      node: createNode({
        cornerRadius2D: 5,
        shape2D: 'rectangle',
        shapeSize2D: {
          height: 48,
          width: 48,
        },
      }),
      globalScale: 1,
      decoration: undefined,
      opacity: 1,
      isSelected: false,
    });

    expect(drawShape).toHaveBeenCalledWith(ctx, 'rectangle', 24, 48, 16, {
      height: 48,
      width: 48,
    }, 5);
  });

  it('uses plugin fill opacity for the node body without fading the border', () => {
    const { ctx, operations } = createContext();

    renderNodeBody({
      ctx,
      node: createNode({ fillOpacity2D: 0.15 }),
      globalScale: 1,
      decoration: undefined,
      opacity: 0.8,
      isSelected: false,
    });

    expect(operations).toEqual([
      expect.objectContaining({
        globalAlpha: 0.12,
        kind: 'fill',
      }),
      expect.objectContaining({
        globalAlpha: 0.8,
        kind: 'stroke',
      }),
    ]);
  });

  it('uses selected-node contrast styling, decoration colors, and scaled minimum border width', () => {
    const { ctx, operations } = createContext();

    renderNodeBody({
      ctx,
      decoration: createDecoration({ color: '#facc15' }),
      globalScale: 2,
      isSelected: true,
      node: createNode({ borderWidth: 1 }),
      opacity: 0.4,
    });

    expect(operations).toEqual([
      expect.objectContaining({
        fillStyle: '#facc15',
        globalAlpha: 0.4,
        kind: 'fill',
      }),
      expect.objectContaining({
        globalAlpha: 0.4,
        kind: 'stroke',
        lineWidth: 1.5,
        strokeStyle: 'Highlight',
      }),
    ]);
  });

  it('uses the theme-resolved selected border color when no decoration overrides it', () => {
    const { ctx, operations } = createContext();

    renderNodeBody({
      ctx,
      decoration: undefined,
      globalScale: 1,
      isSelected: true,
      node: createNode({ borderWidth: 4 }),
      opacity: 0.6,
    });

    expect(operations).toEqual([
      expect.objectContaining({
        fillStyle: '#3b82f6',
        globalAlpha: 0.6,
        kind: 'fill',
      }),
      expect.objectContaining({
        globalAlpha: 0.6,
        kind: 'stroke',
        lineWidth: 4,
        strokeStyle: 'Highlight',
      }),
    ]);
  });

  it('renders decorated labels when labels are visible at the current zoom', () => {
    const { ctx, operations } = createContext();

    renderNodeLabel({
      ctx,
      node: createNode(),
      globalScale: 1.4,
      decoration: createDecoration({ label: { text: 'Decorated Label', color: '#facc15' } }),
      opacity: 0.8,
      isHighlighted: true,
    });

    expect(operations).toHaveLength(1);
    expect(operations[0]?.kind).toBe('fillText');
    expect(operations[0]?.fillStyle).toBe('#facc15');
    expect(operations[0]?.font).toBe(`${12 / 1.4}px Sans-Serif`);
    expect(operations[0]?.globalAlpha).toBeCloseTo(0.8);
    expect(operations[0]?.text).toBe('Decorated Label');
    expect(operations[0]?.textAlign).toBe('center');
    expect(operations[0]?.textBaseline).toBe('top');
    expect(operations[0]?.x).toBe(24);
    expect(operations[0]?.y).toBe(48 + 16 + 2 / 1.4);
  });

  it('uses the muted light-theme label color for non-highlighted nodes', () => {
    const { ctx, operations } = createContext();

    renderNodeLabel({
      ctx,
      node: createNode(),
      globalScale: 2,
      decoration: undefined,
      opacity: 1,
      isHighlighted: false,
    });

    expect(operations).toEqual([
      expect.objectContaining({
        fillStyle: 'GrayText',
        kind: 'fillText',
        text: 'app.ts',
      }),
    ]);
  });

  it('uses the highlighted label color when no decoration label overrides it', () => {
    const { ctx, operations } = createContext();

    renderNodeLabel({
      ctx,
      decoration: undefined,
      globalScale: 2,
      isHighlighted: true,
      node: createNode(),
      opacity: 1,
    });

    expect(operations).toEqual([
      expect.objectContaining({
        fillStyle: 'CanvasText',
        kind: 'fillText',
        text: 'app.ts',
      }),
    ]);
  });

  it('uses a custom highlighted label color when appearance provides it', () => {
    const { ctx, operations } = createContext();

    renderNodeLabel({
      appearance: {
        labelForeground: 'ThemeLabel',
        labelMutedForeground: 'ThemeMutedLabel',
      },
      ctx,
      decoration: undefined,
      globalScale: 2,
      isHighlighted: true,
      node: createNode(),
      opacity: 1,
    });

    expect(operations).toEqual([
      expect.objectContaining({
        fillStyle: 'ThemeLabel',
        kind: 'fillText',
        text: 'app.ts',
      }),
    ]);
  });

  it('uses a custom muted label color for non-highlighted nodes', () => {
    const { ctx, operations } = createContext();

    renderNodeLabel({
      appearance: {
        labelForeground: 'ThemeLabel',
        labelMutedForeground: 'ThemeMutedLabel',
      },
      ctx,
      decoration: undefined,
      globalScale: 2,
      isHighlighted: false,
      node: createNode(),
      opacity: 1,
    });

    expect(operations).toEqual([
      expect.objectContaining({
        fillStyle: 'ThemeMutedLabel',
        kind: 'fillText',
        text: 'app.ts',
      }),
    ]);
  });

  it('keeps label rendering aligned when zoomed far out', () => {
    const { ctx, operations } = createContext();

    renderNodeLabel({
      ctx,
      decoration: undefined,
      globalScale: 0.005,
      isHighlighted: true,
      node: createNode(),
      opacity: 1,
    });

    expect(ctx.fillText).toHaveBeenCalledWith('app.ts', 24, 464);
    expect(operations).toHaveLength(1);
  });

  it('renders the label when zoom moves just above the minimum opacity threshold', () => {
    const { ctx, operations } = createContext();

    renderNodeLabel({
      ctx,
      decoration: undefined,
      globalScale: 0.363,
      isHighlighted: true,
      node: createNode(),
      opacity: 1,
    });

    expect(ctx.fillText).toHaveBeenCalledOnce();
    expect(operations).toEqual([
      expect.objectContaining({
        fillStyle: 'CanvasText',
        kind: 'fillText',
        text: 'app.ts',
      }),
    ]);
  });
});
