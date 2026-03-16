import { describe, expect, it, vi } from 'vitest';
import type { NodeDecorationPayload } from '../../../../src/shared/types';
import type { ThemeKind } from '../../../../src/webview/hooks/useTheme';

vi.mock('../../../../src/webview/lib/shapes2D', () => ({
  drawShape: vi.fn(),
}));

import { drawShape } from '../../../../src/webview/lib/shapes2D';
import type { FGNode } from '../../../../src/webview/components/graphModel';
import { renderNodeBody, renderNodeLabel } from '../../../../src/webview/components/graph/rendering/nodeBody';

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

function createContext(): CanvasRenderingContext2D {
  return {
    fill: vi.fn(),
    fillText: vi.fn(),
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

describe('graph/rendering/nodeBody', () => {
  it('draws the node body and stroke using node styling', () => {
    const ctx = createContext();

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
  });

  it('renders decorated labels when labels are visible at the current zoom', () => {
    const ctx = createContext();

    renderNodeLabel({
      ctx,
      node: createNode(),
      globalScale: 2,
      decoration: createDecoration({ label: { text: 'Decorated Label', color: '#facc15' } }),
      opacity: 1,
      isHighlighted: true,
      theme: 'dark',
    });

    expect(ctx.fillText).toHaveBeenCalledWith('Decorated Label', 24, 65);
    expect(ctx.fillStyle).toBe('#facc15');
  });

  it('uses the muted light-theme label color for non-highlighted nodes', () => {
    const ctx = createContext();

    renderNodeLabel({
      ctx,
      node: createNode(),
      globalScale: 2,
      decoration: undefined,
      opacity: 1,
      isHighlighted: false,
      theme: 'light' satisfies ThemeKind,
    });

    expect(ctx.fillStyle).toBe('#9ca3af');
  });
});
