import { describe, expect, it, vi } from 'vitest';
import {
  renderCollapsedSectionBadge,
} from '../../../../../src/webview/components/graph/rendering/node/collapsedSectionBadge';
import type { FGNode } from '../../../../../src/webview/components/graph/model/build';

const APPEARANCE = {
  labelForeground: '#f8fafc',
  nodeSelectionBorder: '#2563eb',
};

function createNode(overrides: Partial<FGNode> = {}): FGNode {
  return {
    id: 'section-1',
    label: 'Section 1',
    size: 16,
    borderColor: '#0f172a',
    hiddenDescendantCount: 4,
    isCollapsedGraphSection: true,
    isGraphSection: true,
    nodeType: 'graph-section',
    x: 24,
    y: 48,
    ...overrides,
  } as FGNode;
}

function createContext(): CanvasRenderingContext2D {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    font: '',
    lineWidth: 0,
    strokeStyle: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D;
}

describe('graph/rendering/node/collapsedSectionBadge', () => {
  it('draws a top-right hidden-descendant badge and top-left expand chevron', () => {
    const ctx = createContext();

    renderCollapsedSectionBadge({
      appearance: APPEARANCE,
      ctx,
      globalScale: 2,
      node: createNode(),
    });

    expect(ctx.save).toHaveBeenCalledOnce();
    expect(ctx.beginPath).toHaveBeenCalledTimes(2);
    expect(ctx.arc).toHaveBeenCalledWith(35.2, 36.8, 3, 0, Math.PI * 2);
    expect(ctx.fillStyle).toBe(APPEARANCE.labelForeground);
    expect(ctx.fill).toHaveBeenCalledOnce();
    expect(ctx.strokeStyle).toBe('#0f172a');
    expect(ctx.lineWidth).toBe(1);
    expect(ctx.stroke).toHaveBeenCalledTimes(2);
    expect(ctx.font).toBe('8px sans-serif');
    expect(ctx.textAlign).toBe('center');
    expect(ctx.textBaseline).toBe('middle');
    expect(ctx.fillText).toHaveBeenCalledWith('4', 35.2, 36.925);
    expect(ctx.moveTo).toHaveBeenCalledWith(10.8, 35.8);
    expect(ctx.lineTo).toHaveBeenCalledWith(12.8, 37.8);
    expect(ctx.lineTo).toHaveBeenCalledWith(14.8, 35.8);
    expect(ctx.restore).toHaveBeenCalledOnce();
  });

  it('caps the visible hidden-descendant count after 99', () => {
    const ctx = createContext();

    renderCollapsedSectionBadge({
      appearance: APPEARANCE,
      ctx,
      globalScale: 1,
      node: createNode({ hiddenDescendantCount: 100 }),
    });

    expect(ctx.fillText).toHaveBeenCalledWith('99+', 35.2, 37.05);
  });

  it('keeps 99 as an exact visible hidden-descendant count', () => {
    const ctx = createContext();

    renderCollapsedSectionBadge({
      appearance: APPEARANCE,
      ctx,
      globalScale: 1,
      node: createNode({ hiddenDescendantCount: 99 }),
    });

    expect(ctx.fillText).toHaveBeenCalledWith('99', 35.2, 37.05);
  });

  it('draws the expand chevron without a count badge for zero hidden descendants', () => {
    const ctx = createContext();

    renderCollapsedSectionBadge({
      appearance: APPEARANCE,
      ctx,
      globalScale: 1,
      node: createNode({ hiddenDescendantCount: 0 }),
    });

    expect(ctx.arc).not.toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalledWith(12.8, 38.8);
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it.each([
    ['expanded Section Node', { isCollapsedGraphSection: false }],
    ['missing x coordinate', { x: undefined }],
    ['missing y coordinate', { y: undefined }],
  ])('skips the badge for %s', (_label, overrides) => {
    const ctx = createContext();

    renderCollapsedSectionBadge({
      appearance: APPEARANCE,
      ctx,
      globalScale: 1,
      node: createNode(overrides),
    });

    expect(ctx.arc).not.toHaveBeenCalled();
    expect(ctx.lineTo).not.toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });
});
