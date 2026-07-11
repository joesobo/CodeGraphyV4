import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../src/webview/components/graph/rendering/shapes/draw/twoDimensional', () => ({
  drawShape: vi.fn(),
}));

import type { FGNode } from '../../../../../src/webview/components/graph/model/build';
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



    it('keeps label text mapped to its node at extreme zoom out', () => {
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
