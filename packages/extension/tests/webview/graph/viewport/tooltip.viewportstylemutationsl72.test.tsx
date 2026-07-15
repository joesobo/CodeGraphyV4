/**
 * Tests targeting surviving mutations in Viewport.tsx:
 * - L66: ArrowFunction: () => undefined on onContextMenu handler
 * - L67: ArrowFunction: () => undefined on onMouseLeave handler
 * - L72: StringLiteral "" on style properties
 * - L111: LogicalOperator on tooltipData.info?.incomingCount ?? 0
 * - L112: LogicalOperator on tooltipData.info?.outgoingCount ?? 0
 */
import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Viewport } from '../../../../src/webview/components/graph/viewport/view';
import { createDefaultViewportSurfaceProps } from '../rendering/surface/owned2d/surfaceFixture';

const harness = vi.hoisted(() => ({
  nodeTooltip: vi.fn(),
  surface2d: vi.fn(),
}));

vi.mock('../../../../src/webview/components/nodeTooltip/view', () => ({
  NodeTooltip: (props: Record<string, unknown>) => {
    harness.nodeTooltip(props);
    return <div data-testid="node-tooltip" data-visible={String(props.visible)} data-path={String(props.path)} />;
  },
}));

vi.mock('../../../../src/webview/components/graph/rendering/surface/owned2d/view', () => ({
  OwnedGraphSurface2d: (props: Record<string, unknown>) => {
    harness.surface2d(props);
    return <div data-testid="surface-2d" />;
  },
}));

vi.mock('../../../../src/webview/components/ui/context/menu', () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button type="button" onClick={onClick}>{children}</button>,
  ContextMenuSeparator: () => <hr data-testid="separator" />,
  ContextMenuShortcut: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

function createSharedProps() {
  return {
    graphData: { nodes: [], links: [] },
    onBackgroundClick: vi.fn(),
    onBackgroundRightClick: vi.fn(),
    onEngineStop: vi.fn(),
    onLinkClick: vi.fn(),
    onLinkRightClick: vi.fn(),
    onNodeClick: vi.fn(),
    onNodeDrag: vi.fn(),
    onNodeDragEnd: vi.fn(),
    onNodeHover: vi.fn(),
    onNodeRightClick: vi.fn(),
    width: 300,
  };
}

function renderViewport(overrides: Partial<React.ComponentProps<typeof Viewport>> = {}) {
  const handleContextMenu = vi.fn();
  const handleMouseLeave = vi.fn();
  const handleMenuAction = vi.fn();
  const handleMouseDownCapture = vi.fn();
  const handleMouseMoveCapture = vi.fn();
  const handleMouseUpCapture = vi.fn();

  render(
    <Viewport
      canvasBackgroundColor="transparent"
      containerBackgroundColor="var(--cg-popover-translucent)"
      containerRef={{ current: document.createElement('div') }}
      directionMode="arrows"
      handleContextMenu={handleContextMenu}
      handleMenuAction={handleMenuAction}
      handleMouseDownCapture={handleMouseDownCapture}
      handleMouseLeave={handleMouseLeave}
      handleMouseMoveCapture={handleMouseMoveCapture}
      handleMouseUpCapture={handleMouseUpCapture}
      menuEntries={[]}
      surface2dProps={{
        ...createDefaultViewportSurfaceProps(),
        sharedProps: createSharedProps(),
      }}
      tooltipData={{
        visible: false,
        nodeRect: { x: 0, y: 0, radius: 0 },
        path: '',
        info: null,
        pluginSections: [],
      }}
      {...overrides}
    />,
  );

  return { handleContextMenu, handleMouseLeave, handleMenuAction, handleMouseDownCapture, handleMouseMoveCapture, handleMouseUpCapture };
}

describe('Viewport style mutations (L72)', () => {

    it('applies graph-container class to the viewport div', () => {
      renderViewport();
      const container = document.querySelector('.graph-container');
      expect(container).not.toBeNull();
    });



    it('applies inset-2 class to the viewport div', () => {
      renderViewport();
      const container = document.querySelector('.graph-container') as HTMLElement;
      expect(container.className).toContain('inset-2');
    });



    it('applies rounded-md class to the viewport div', () => {
      renderViewport();
      const container = document.querySelector('.graph-container') as HTMLElement;
      expect(container.className).toContain('rounded-md');
    });



    it('sets cursor to default on the container style', () => {
      renderViewport();
      const container = document.querySelector('.graph-container') as HTMLElement;
      expect(container.style.cursor).toBe('default');
    });



    it('applies the background color without inline border styling', () => {
      renderViewport({ containerBackgroundColor: 'var(--cg-popover-translucent)' });
      const container = document.querySelector('.graph-container') as HTMLElement;
      expect(container.style.backgroundColor).toBe('var(--cg-popover-translucent)');
      expect(container.style.borderColor).toBe('');
    });
});
