import { describe, expect, it, vi } from 'vitest';
import type { NodeDecorationPayload } from '../../../../src/shared/contracts';
import type { ThemeKind } from '../../../../src/webview/useTheme';

vi.mock('../../../../src/webview/components/graph/rendering/shapes2D', () => ({
  drawShape: vi.fn(),
}));

import { drawShape } from '../../../../src/webview/components/graph/rendering/shapes2D';
import type { FGNode } from '../../../../src/webview/components/graphModel';
import { renderNodeBody, renderNodeLabel } from '../../../../src/webview/components/graph/rendering/nodeBody';

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
        textAlign: ctx.textAlign,
        textBaseline: ctx.textBaseline,
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
        textAlign: ctx.textAlign,
        textBaseline: ctx.textBaseline,
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
        textAlign: ctx.textAlign,
        textBaseline: ctx.textBaseline,
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

describe('graph/rendering/nodeBody', () => {
  it('draws the node body and stroke using node styling', () => {
    const { ctx, operations } = createContext();

    renderNodeBody({
      ctx,
      node: createNode(),
      globalScale: 1,
      decoration: undefined,
      opacity: 1,
      isSelected: false,
      theme: 'dark',
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

  it('uses selected-node contrast styling, decoration colors, and scaled minimum border width', () => {
    const { ctx, operations } = createContext();

    renderNodeBody({
      ctx,
      decoration: createDecoration({ color: '#facc15' }),
      globalScale: 2,
      isSelected: true,
      node: createNode({ borderWidth: 1 }),
      opacity: 0.4,
      theme: 'light',
    });

    expect(operations).toEqual([
      expect.objectContaining({
        fillStyle: '#facc15',
        globalAlpha: 1,
        kind: 'fill',
      }),
      expect.objectContaining({
        globalAlpha: 0.4,
        kind: 'stroke',
        lineWidth: 1.5,
        strokeStyle: '#000000',
      }),
    ]);
  });

  it('uses the dark-theme selected border color when no decoration overrides it', () => {
    const { ctx, operations } = createContext();

    renderNodeBody({
      ctx,
      decoration: undefined,
      globalScale: 1,
      isSelected: true,
      node: createNode({ borderWidth: 4 }),
      opacity: 0.6,
      theme: 'dark',
    });

    expect(operations).toEqual([
      expect.objectContaining({
        fillStyle: '#3b82f6',
        globalAlpha: 1,
        kind: 'fill',
      }),
      expect.objectContaining({
        globalAlpha: 0.6,
        kind: 'stroke',
        lineWidth: 4,
        strokeStyle: '#ffffff',
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
      theme: 'dark',
    });

    expect(operations).toHaveLength(1);
    expect(operations[0]?.kind).toBe('fillText');
    expect(operations[0]?.fillStyle).toBe('#facc15');
    expect(operations[0]?.font).toBe(`${12 / 1.4}px Sans-Serif`);
    expect(operations[0]?.globalAlpha).toBeCloseTo(0.4);
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
      theme: 'light' satisfies ThemeKind,
    });

    expect(operations).toEqual([
      expect.objectContaining({
        fillStyle: '#9ca3af',
        kind: 'fillText',
        text: 'app.ts',
      }),
    ]);
  });

  it('uses the highlighted light-theme label color when no decoration label overrides it', () => {
    const { ctx, operations } = createContext();

    renderNodeLabel({
      ctx,
      decoration: undefined,
      globalScale: 2,
      isHighlighted: true,
      node: createNode(),
      opacity: 1,
      theme: 'light',
    });

    expect(operations).toEqual([
      expect.objectContaining({
        fillStyle: '#1e1e1e',
        kind: 'fillText',
        text: 'app.ts',
      }),
    ]);
  });

  it('uses the highlighted dark-theme label color when no decoration label overrides it', () => {
    const { ctx, operations } = createContext();

    renderNodeLabel({
      ctx,
      decoration: undefined,
      globalScale: 2,
      isHighlighted: true,
      node: createNode(),
      opacity: 1,
      theme: 'dark',
    });

    expect(operations).toEqual([
      expect.objectContaining({
        fillStyle: '#e2e8f0',
        kind: 'fillText',
        text: 'app.ts',
      }),
    ]);
  });

  it('uses the muted dark-theme label color for non-highlighted nodes', () => {
    const { ctx, operations } = createContext();

    renderNodeLabel({
      ctx,
      decoration: undefined,
      globalScale: 2,
      isHighlighted: false,
      node: createNode(),
      opacity: 1,
      theme: 'dark',
    });

    expect(operations).toEqual([
      expect.objectContaining({
        fillStyle: '#4a5568',
        kind: 'fillText',
        text: 'app.ts',
      }),
    ]);
  });

  it('skips label rendering when the zoom level keeps label opacity near zero', () => {
    const { ctx, operations } = createContext();

    renderNodeLabel({
      ctx,
      decoration: undefined,
      globalScale: 0.81,
      isHighlighted: true,
      node: createNode(),
      opacity: 1,
      theme: 'dark',
    });

    expect(ctx.fillText).not.toHaveBeenCalled();
    expect(operations).toEqual([]);
  });

  it('renders the label when zoom moves just above the minimum opacity threshold', () => {
    const { ctx, operations } = createContext();

    renderNodeLabel({
      ctx,
      decoration: undefined,
      globalScale: 0.813,
      isHighlighted: true,
      node: createNode(),
      opacity: 1,
      theme: 'dark',
    });

    expect(ctx.fillText).toHaveBeenCalledOnce();
    expect(operations).toEqual([
      expect.objectContaining({
        fillStyle: '#e2e8f0',
        kind: 'fillText',
        text: 'app.ts',
      }),
    ]);
  });
});
