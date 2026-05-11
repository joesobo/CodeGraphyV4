import { describe, expect, it, vi } from 'vitest';
import {
  formatCollapsedDescendantCount,
  renderNodeCollapseIndicator,
  shouldRenderNodeCollapseIndicator,
} from '../../../../../src/webview/components/graph/rendering/node/collapseIndicator';
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

describe('graph/rendering/node/collapseIndicator', () => {
  it('renders only collapsible folder node indicators', () => {
    expect(shouldRenderNodeCollapseIndicator(folderNode({ isCollapsible: true }))).toBe(true);
    expect(shouldRenderNodeCollapseIndicator(folderNode({ isCollapsible: false }))).toBe(false);
    expect(shouldRenderNodeCollapseIndicator(folderNode({ nodeType: 'file', isCollapsible: true }))).toBe(false);
  });

  it('caps collapsed descendant badge labels', () => {
    expect(formatCollapsedDescendantCount(0)).toBe('');
    expect(formatCollapsedDescendantCount(12)).toBe('12');
    expect(formatCollapsedDescendantCount(100)).toBe('99+');
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

    const chevronStartY = vi.mocked(ctx.moveTo).mock.calls[0][1];
    const chevronPeakY = vi.mocked(ctx.lineTo).mock.calls[0][1];
    expect(chevronPeakY).toBeLessThan(chevronStartY);
    expect(ctx.fillText).toHaveBeenCalledWith('12', expect.any(Number), expect.any(Number));
    expect(ctx.fillStyle).toBe('#f8fafc');
  });
});
