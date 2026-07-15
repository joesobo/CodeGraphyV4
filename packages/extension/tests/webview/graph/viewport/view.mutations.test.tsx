import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GraphContextMenuEntry } from '../../../../src/webview/components/graph/contextMenu/contracts';
import { Viewport } from '../../../../src/webview/components/graph/viewport/view';
import { createDefaultViewportSurfaceProps } from '../rendering/surface/owned2d/surfaceFixture';

const harness = vi.hoisted(() => ({
  nodeTooltip: vi.fn(),
  surface2d: vi.fn(),
}));

vi.mock('../../../../src/webview/components/nodeTooltip/view', () => ({
  NodeTooltip: (props: Record<string, unknown>) => {
    harness.nodeTooltip(props);
    return <div data-testid="node-tooltip">{String(props.path)}</div>;
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
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="ctx-content">{children}</div>,
  ContextMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => <button type="button" onClick={onClick} className={className}>{children}</button>,
  ContextMenuSeparator: () => <hr data-testid="separator" />,
  ContextMenuShortcut: ({ children }: { children: React.ReactNode }) => <span data-testid="shortcut">{children}</span>,
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
  const handleMenuAction = vi.fn();
  const handleContextMenu = vi.fn();
  const handleMouseLeave = vi.fn();

  render(
    <Viewport
      canvasBackgroundColor="transparent"
      containerBackgroundColor="var(--cg-popover-translucent)"
      borderColor="#222222"
      containerRef={{ current: document.createElement('div') }}
      directionMode="arrows"
      handleContextMenu={handleContextMenu}
      handleMenuAction={handleMenuAction}
      handleMouseDownCapture={vi.fn()}
      handleMouseLeave={handleMouseLeave}
      handleMouseMoveCapture={vi.fn()}
      handleMouseUpCapture={vi.fn()}
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

  return { handleMenuAction, handleContextMenu, handleMouseLeave };
}

describe('Viewport (mutation targets)', () => {
  it('renders destructive class on destructive menu items', () => {
    const entries: GraphContextMenuEntry[] = [
      {
        id: 'delete',
        kind: 'item',
        label: 'Delete File',
        action: { kind: 'builtin', action: 'delete' },
        destructive: true,
      },
    ];

    renderViewport({ menuEntries: entries });

    const deleteButton = screen.getByRole('button', { name: /delete file/i });
    expect(deleteButton.className).toContain('text-[var(--cg-error-foreground)]');
  });

  it('does not render destructive class on non-destructive items', () => {
    const entries: GraphContextMenuEntry[] = [
      {
        id: 'open',
        kind: 'item',
        label: 'Open File',
        action: { kind: 'builtin', action: 'open' },
      },
    ];

    renderViewport({ menuEntries: entries });

    const openButton = screen.getByRole('button', { name: /open file/i });
    expect(openButton.className || '').not.toContain('text-[var(--cg-error-foreground)]');
  });

  it('renders shortcut text when entry has a shortcut', () => {
    const entries: GraphContextMenuEntry[] = [
      {
        id: 'open',
        kind: 'item',
        label: 'Open File',
        action: { kind: 'builtin', action: 'open' },
        shortcut: 'Enter',
      },
    ];

    renderViewport({ menuEntries: entries });

    expect(screen.getByTestId('shortcut')).toHaveTextContent('Enter');
  });

  it('does not render shortcut when entry has no shortcut', () => {
    const entries: GraphContextMenuEntry[] = [
      {
        id: 'open',
        kind: 'item',
        label: 'Open File',
        action: { kind: 'builtin', action: 'open' },
      },
    ];

    renderViewport({ menuEntries: entries });

    expect(screen.queryByTestId('shortcut')).not.toBeInTheDocument();
  });

  it('applies recessed graph stage spacing without an outline border', () => {
    renderViewport({ containerBackgroundColor: 'var(--cg-popover-translucent)', borderColor: '#ddeeff' });

    const container = document.querySelector('.graph-container') as HTMLElement;
    expect(container).toHaveClass('inset-2');
    expect(container).not.toHaveClass('m-1');
    expect(container.style.backgroundColor).toBe('var(--cg-popover-translucent)');
    expect(container.style.borderWidth).toBe('0px');
  });

  it('renders separator entries as hr elements', () => {
    const entries: GraphContextMenuEntry[] = [
      { id: 'sep-1', kind: 'separator' },
    ];

    renderViewport({ menuEntries: entries });

    expect(screen.getByTestId('separator')).toBeInTheDocument();
  });
});
