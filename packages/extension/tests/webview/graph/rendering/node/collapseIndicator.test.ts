import { describe, expect, it, vi } from 'vitest';
import {
  formatCollapsedDescendantCount,
  getNodeCollapseIndicatorCenter,
  renderNodeCollapseIndicator,
  shouldRenderNodeCollapseIndicator,
} from '../../../../../src/webview/components/graph/rendering/node/collapseIndicator';
import { renderCountBadge } from '../../../../../src/webview/components/graph/rendering/node/collapseIndicator/badge';
import { renderChevron } from '../../../../../src/webview/components/graph/rendering/node/collapseIndicator/chevron';
import type { FGNode } from '../../../../../src/webview/components/graph/model/build';

function folderNode(overrides: Partial<FGNode> = {}): FGNode {
  return {
    id: 'src',
    label: 'src',
    color: '#38bdf8',
    borderColor: '#38bdf8',
    borderWidth: 2,
    baseOpacity: 1,
    isFavorite: false,
    isPinned: false,
    nodeType: 'folder',
    size: 16,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function createContext(): CanvasRenderingContext2D {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    fillStyle: '',
    fillText: vi.fn(),
    font: '',
    lineCap: 'butt',
    lineJoin: 'miter',
    lineTo: vi.fn(),
    lineWidth: 1,
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    strokeStyle: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D;
}

function trackFillStyle(ctx: CanvasRenderingContext2D): string[] {
  const fillStyles: string[] = [];
  Object.defineProperty(ctx, 'fillStyle', {
    configurable: true,
    get: () => fillStyles.at(-1) ?? '',
    set: (value) => {
      fillStyles.push(String(value));
    },
  });
  return fillStyles;
}

describe('graph/rendering/node/collapseIndicator', () => {
  it('renders only collapsible folder node indicators', () => {
    expect(shouldRenderNodeCollapseIndicator(folderNode({ isCollapsible: true }))).toBe(true);
    expect(shouldRenderNodeCollapseIndicator(folderNode({ isCollapsible: false }))).toBe(false);
    expect(shouldRenderNodeCollapseIndicator(folderNode({ nodeType: 'file', isCollapsible: true }))).toBe(false);
  });

  it('caps collapsed descendant badge labels', () => {
    expect(formatCollapsedDescendantCount(undefined)).toBe('');
    expect(formatCollapsedDescendantCount(-1)).toBe('');
    expect(formatCollapsedDescendantCount(0)).toBe('');
    expect(formatCollapsedDescendantCount(1)).toBe('1');
    expect(formatCollapsedDescendantCount(12)).toBe('12');
    expect(formatCollapsedDescendantCount(99)).toBe('99');
    expect(formatCollapsedDescendantCount(100)).toBe('99+');
  });

  it('positions the collapse chevron in the upper-left quadrant of the node', () => {
    expect(getNodeCollapseIndicatorCenter(folderNode({
      size: 20,
      x: 100,
      y: 80,
    }))).toEqual({
      x: 88.4,
      y: 68.4,
    });
  });

  it('does not draw for nodes without a collapse affordance', () => {
    const ctx = createContext();

    renderNodeCollapseIndicator(ctx, folderNode({ isCollapsible: false }), 1);

    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
    expect(ctx.fill).not.toHaveBeenCalled();
  });

  it('renders collapsed folders with an upward chevron and foreground badge text', () => {
    const ctx = createContext();

    renderNodeCollapseIndicator(
      ctx,
      folderNode({
        collapsedDescendantCount: 12,
        isCollapsible: true,
        isCollapsed: true,
      }),
      1,
      {
        labelForeground: '#f8fafc',
        stageBackground: '#111827',
      },
    );

    const [chevronStartX, chevronStartY] = vi.mocked(ctx.moveTo).mock.calls[0];
    const [chevronPeakX, chevronPeakY] = vi.mocked(ctx.lineTo).mock.calls[0];
    const [chevronEndX, chevronEndY] = vi.mocked(ctx.lineTo).mock.calls[1];
    expect(chevronStartX).toBeLessThan(chevronPeakX);
    expect(chevronEndX).toBeGreaterThan(chevronPeakX);
    expect(chevronPeakY).toBeLessThan(chevronStartY);
    expect(chevronPeakY).toBeLessThan(chevronEndY);
    expect(ctx.fillText).toHaveBeenCalledWith('12', expect.any(Number), expect.any(Number));
    expect(ctx.fillStyle).toBe('#f8fafc');
  });

  it('renders expanded folders with a downward chevron and no descendant badge', () => {
    const ctx = createContext();

    renderNodeCollapseIndicator(
      ctx,
      folderNode({
        collapsedDescendantCount: 12,
        isCollapsible: true,
        isCollapsed: false,
      }),
      1,
    );

    const chevronStartY = vi.mocked(ctx.moveTo).mock.calls[0][1];
    const chevronPointY = vi.mocked(ctx.lineTo).mock.calls[0][1];
    const chevronEndY = vi.mocked(ctx.lineTo).mock.calls[1][1];
    expect(chevronPointY).toBeGreaterThan(chevronStartY);
    expect(chevronPointY).toBeGreaterThan(chevronEndY);
    expect(ctx.arc).not.toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('scales badge geometry and text against graph zoom', () => {
    const ctx = createContext();

    renderNodeCollapseIndicator(
      ctx,
      folderNode({
        borderColor: '',
        collapsedDescendantCount: 5,
        color: '#0ea5e9',
        isCollapsible: true,
        isCollapsed: true,
        size: 20,
        x: 10,
        y: 30,
      }),
      0.5,
      {
        labelForeground: '#f8fafc',
        stageBackground: '#111827',
      },
    );

    expect(ctx.lineWidth).toBe(2.5);
    expect(ctx.arc).toHaveBeenCalledWith(21, 41, 12, 0, Math.PI * 2);
    expect(ctx.font).toBe('16px Sans-Serif');
    expect(vi.mocked(ctx.fillText).mock.calls[0]).toEqual(['5', 21, 41]);
  });

  it('draws exact collapsed chevron strokes', () => {
    const ctx = createContext();

    renderChevron(ctx, 10, 20, 2, true, '#f8fafc');

    expect(ctx.strokeStyle).toBe('#f8fafc');
    expect(ctx.lineWidth).toBe(2.5);
    expect(ctx.lineCap).toBe('round');
    expect(ctx.lineJoin).toBe('round');
    expect(vi.mocked(ctx.moveTo).mock.calls[0]).toEqual([3, 23.5]);
    expect(vi.mocked(ctx.lineTo).mock.calls).toEqual([
      [10, 20 - 14 * 0.35],
      [17, 23.5],
    ]);
  });

  it('draws exact expanded chevron strokes', () => {
    const ctx = createContext();

    renderChevron(ctx, 10, 20, 2, false, '#f8fafc');

    expect(vi.mocked(ctx.moveTo).mock.calls[0]).toEqual([3, 16.5]);
    expect(vi.mocked(ctx.lineTo).mock.calls).toEqual([
      [10, 20 + 14 * 0.35],
      [17, 16.5],
    ]);
  });

  it('uses border color before text color for collapse badges', () => {
    const ctx = createContext();
    const fillStyles = trackFillStyle(ctx);

    renderCountBadge(ctx, folderNode({
      borderColor: '#1d4ed8',
      color: '#0ea5e9',
      size: 20,
      x: 10,
      y: 30,
    }), '7', 1, '#f8fafc');

    expect(fillStyles).toEqual(['#1d4ed8', '#f8fafc']);
    expect(ctx.arc).toHaveBeenCalledWith(21, 41, 6, 0, Math.PI * 2);
    expect(ctx.font).toBe('8px Sans-Serif');
    expect(ctx.textAlign).toBe('center');
    expect(ctx.textBaseline).toBe('middle');
    expect(ctx.fillText).toHaveBeenCalledWith('7', 21, 41);
  });

  it('falls back to node color for collapse badges without a border color', () => {
    const ctx = createContext();
    const fillStyles = trackFillStyle(ctx);

    renderCountBadge(ctx, folderNode({
      borderColor: '',
      color: '#0ea5e9',
    }), '7', 1, '#f8fafc');

    expect(fillStyles[0]).toBe('#0ea5e9');
  });
});
