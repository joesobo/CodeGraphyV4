import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GraphContextMenuEntry } from '../../../../src/webview/components/graph/contextMenu/contracts';
import { Viewport } from '../../../../src/webview/components/graph/Viewport';

const harness = vi.hoisted(() => ({
  nodeTooltip: vi.fn(),
  surface2d: vi.fn(),
  surface3d: vi.fn(),
}));

vi.mock('../../../../src/webview/components/nodeTooltip/view', () => ({
  NodeTooltip: (props: Record<string, unknown>) => {
    harness.nodeTooltip(props);
    return <div data-testid="node-tooltip">{String(props.path)}</div>;
  },
}));

vi.mock('../../../../src/webview/components/graph/rendering/surface/view2d', () => ({
  Surface2d: (props: Record<string, unknown>) => {
    harness.surface2d(props);
    return <div data-testid="surface-2d" />;
  },
}));

vi.mock('../../../../src/webview/components/graph/rendering/surface/view3d', () => ({
  Surface3d: (props: Record<string, unknown>) => {
    harness.surface3d(props);
    return <div data-testid="surface-3d" />;
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
    cooldownTicks: 20,
    d3AlphaDecay: 0.0228,
    d3VelocityDecay: 0.7,
    dagLevelDistance: undefined,
    dagMode: undefined,
    graphData: { nodes: [], links: [] },
    height: 200,
    nodeId: 'id' as const,
    onBackgroundClick: vi.fn(),
    onBackgroundRightClick: vi.fn(),
    onEngineStop: vi.fn(),
    onLinkClick: vi.fn(),
    onLinkRightClick: vi.fn(),
    onNodeClick: vi.fn(),
    onNodeHover: vi.fn(),
    onNodeRightClick: vi.fn(),
    warmupTicks: 0,
    width: 300,
  };
}

function renderViewport(overrides: Partial<React.ComponentProps<typeof Viewport>> = {}) {
  const handleMenuAction = vi.fn();
  const handleContextMenu = vi.fn();
  const handleMouseLeave = vi.fn();

  render(
    <Viewport
      backgroundColor="#111111"
      borderColor="#222222"
      containerRef={{ current: document.createElement('div') }}
      directionMode="arrows"
      graphMode="2d"
      handleContextMenu={handleContextMenu}
      handleMenuAction={handleMenuAction}
      handleMouseDownCapture={vi.fn()}
      handleMouseLeave={handleMouseLeave}
      handleMouseMoveCapture={vi.fn()}
      handleMouseUpCapture={vi.fn()}
      menuEntries={[]}
      surface2dProps={{
        fg2dRef: { current: undefined },
        getArrowColor: vi.fn(),
        getArrowRelPos: vi.fn(),
        getLinkColor: vi.fn(),
        getLinkParticles: vi.fn(),
        getLinkWidth: vi.fn(),
        getParticleColor: vi.fn(),
        linkCanvasObject: vi.fn(),
        nodeCanvasObject: vi.fn(),
        nodePointerAreaPaint: vi.fn(),
        onRenderFramePost: vi.fn(),
        particleSize: 2,
        particleSpeed: 0.1,
        sharedProps: createSharedProps(),
      }}
      surface3dProps={{
        fg3dRef: { current: undefined },
        getArrowColor: vi.fn(),
        getLinkColor: vi.fn(),
        getLinkParticles: vi.fn(),
        getLinkWidth: vi.fn(),
        getParticleColor: vi.fn(),
        nodeThreeObject: vi.fn(),
        particleSize: 2,
        particleSpeed: 0.1,
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
    expect(deleteButton.className).toContain('text-red');
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
    expect(openButton.className || '').not.toContain('text-red');
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

  it('applies background color and border color styles to the container', () => {
    renderViewport({ backgroundColor: '#aabbcc', borderColor: '#ddeeff' });

    const container = document.querySelector('.graph-container') as HTMLElement;
    expect(container.style.backgroundColor).toBe('rgb(170, 187, 204)');
    expect(container.style.borderColor).toBe('rgb(221, 238, 255)');
  });

  it('renders separator entries as hr elements', () => {
    const entries: GraphContextMenuEntry[] = [
      { id: 'sep-1', kind: 'separator' },
    ];

    renderViewport({ menuEntries: entries });

    expect(screen.getByTestId('separator')).toBeInTheDocument();
  });
});
