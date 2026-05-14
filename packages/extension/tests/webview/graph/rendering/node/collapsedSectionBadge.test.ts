import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mdiChevronUp } from '@mdi/js';
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
    scale: vi.fn(),
    translate: vi.fn(),
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
  const originalPath2D = globalThis.Path2D;
  const path2DConstructor = vi.fn();

  beforeEach(() => {
    path2DConstructor.mockClear();
    globalThis.Path2D = path2DConstructor as unknown as typeof Path2D;
  });

  afterEach(() => {
    globalThis.Path2D = originalPath2D;
  });

  it('draws an inset top-right hidden-descendant count and top-left expand chevron', () => {
    const ctx = createContext();

    renderCollapsedSectionBadge({
      appearance: APPEARANCE,
      ctx,
      globalScale: 2,
      node: createNode(),
    });

    expect(ctx.save).toHaveBeenCalledTimes(2);
    expect(ctx.beginPath).not.toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
    expect(ctx.fillStyle).toBe(APPEARANCE.labelForeground);
    expect(ctx.fill).toHaveBeenCalledOnce();
    expect(ctx.stroke).not.toHaveBeenCalled();
    expect(ctx.font).toBe('8px sans-serif');
    expect(ctx.textAlign).toBe('center');
    expect(ctx.textBaseline).toBe('middle');
    expect(ctx.fillText).toHaveBeenCalledWith('4', 35.2, 59.2);
    expect(path2DConstructor).toHaveBeenCalledWith(mdiChevronUp);
    expect(ctx.translate).toHaveBeenCalledWith(7.200000000000001, 31.199999999999996);
    expect(ctx.scale).toHaveBeenCalledWith(0.4666666666666666, 0.4666666666666666);
    expect(ctx.restore).toHaveBeenCalledTimes(2);
  });

  it('caps the visible hidden-descendant count after 99', () => {
    const ctx = createContext();

    renderCollapsedSectionBadge({
      appearance: APPEARANCE,
      ctx,
      globalScale: 1,
      node: createNode({ hiddenDescendantCount: 100 }),
    });

    expect(ctx.fillText).toHaveBeenCalledWith('99+', 35.2, 59.2);
  });

  it('draws a collapsed Section icon centered in the square', () => {
    const ctx = createContext();

    renderCollapsedSectionBadge({
      appearance: APPEARANCE,
      ctx,
      globalScale: 1,
      node: createNode({ icon: 'TS' }),
    });

    expect(ctx.fillText).toHaveBeenCalledWith('TS', 24, 48);
  });

  it('keeps 99 as an exact visible hidden-descendant count', () => {
    const ctx = createContext();

    renderCollapsedSectionBadge({
      appearance: APPEARANCE,
      ctx,
      globalScale: 1,
      node: createNode({ hiddenDescendantCount: 99 }),
    });

    expect(ctx.fillText).toHaveBeenCalledWith('99', 35.2, 59.2);
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
    expect(path2DConstructor).toHaveBeenCalledWith(mdiChevronUp);
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
