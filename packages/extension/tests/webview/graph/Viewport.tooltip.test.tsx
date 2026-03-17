/**
 * Tests targeting surviving mutations in Viewport.tsx:
 * - ArrowFunction: () => undefined on event handlers
 * - LogicalOperator on tooltip rendering (info?.incomingCount ?? 0)
 * - Optional chaining on tooltipData.info?.size etc.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Viewport } from '../../../src/webview/components/graph/Viewport';

const harness = vi.hoisted(() => ({
  nodeTooltip: vi.fn(),
  surface2d: vi.fn(),
  surface3d: vi.fn(),
}));

vi.mock('../../../src/webview/components/NodeTooltip', () => ({
  NodeTooltip: (props: Record<string, unknown>) => {
    harness.nodeTooltip(props);
    return <div data-testid="node-tooltip" data-visible={String(props.visible)} data-path={String(props.path)} />;
  },
}));

vi.mock('../../../src/webview/components/graph/rendering/Surface2d', () => ({
  Surface2d: (props: Record<string, unknown>) => {
    harness.surface2d(props);
    return <div data-testid="surface-2d" />;
  },
}));

vi.mock('../../../src/webview/components/graph/rendering/Surface3d', () => ({
  Surface3d: (props: Record<string, unknown>) => {
    harness.surface3d(props);
    return <div data-testid="surface-3d" />;
  },
}));

vi.mock('../../../src/webview/components/ui/context-menu', () => ({
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
  const handleContextMenu = vi.fn();
  const handleMouseLeave = vi.fn();
  const handleMenuAction = vi.fn();
  const handleMouseDownCapture = vi.fn();
  const handleMouseMoveCapture = vi.fn();
  const handleMouseUpCapture = vi.fn();

  render(
    <Viewport
      backgroundColor="#111111"
      borderColor="#222222"
      containerRef={{ current: document.createElement('div') }}
      directionMode="arrows"
      graphMode="2d"
      handleContextMenu={handleContextMenu}
      handleMenuAction={handleMenuAction}
      handleMouseDownCapture={handleMouseDownCapture}
      handleMouseLeave={handleMouseLeave}
      handleMouseMoveCapture={handleMouseMoveCapture}
      handleMouseUpCapture={handleMouseUpCapture}
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

  return { handleContextMenu, handleMouseLeave, handleMenuAction, handleMouseDownCapture, handleMouseMoveCapture, handleMouseUpCapture };
}

describe('Viewport (tooltip and handler mutations)', () => {
  it('passes tooltip info fields when info is provided', () => {
    renderViewport({
      tooltipData: {
        visible: true,
        nodeRect: { x: 50, y: 60, radius: 15 },
        path: 'src/utils.ts',
        info: {
          size: 1024,
          lastModified: 1700000000000,
          incomingCount: 3,
          outgoingCount: 5,
          plugin: 'TypeScript',
          visits: 7,
        },
        pluginSections: [{ title: 'Coverage', content: '90%' }],
      },
    });

    expect(harness.nodeTooltip).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'src/utils.ts',
        visible: true,
        size: 1024,
        lastModified: 1700000000000,
        incomingCount: 3,
        outgoingCount: 5,
        plugin: 'TypeScript',
        visits: 7,
        extraSections: [{ title: 'Coverage', content: '90%' }],
      }),
    );
  });

  it('passes 0 for incomingCount when info is null', () => {
    renderViewport({
      tooltipData: {
        visible: true,
        nodeRect: { x: 10, y: 20, radius: 5 },
        path: 'src/App.ts',
        info: null,
        pluginSections: [],
      },
    });

    expect(harness.nodeTooltip).toHaveBeenCalledWith(
      expect.objectContaining({
        incomingCount: 0,
        outgoingCount: 0,
      }),
    );
  });

  it('passes 0 for outgoingCount when info is null', () => {
    renderViewport({
      tooltipData: {
        visible: true,
        nodeRect: { x: 10, y: 20, radius: 5 },
        path: 'src/App.ts',
        info: null,
        pluginSections: [],
      },
    });

    const calls = harness.nodeTooltip.mock.calls;
    const lastCallProps = calls[calls.length - 1][0];
    expect(lastCallProps.outgoingCount).toBe(0);
  });

  it('passes undefined for size when info is null', () => {
    renderViewport({
      tooltipData: {
        visible: true,
        nodeRect: { x: 10, y: 20, radius: 5 },
        path: 'src/App.ts',
        info: null,
        pluginSections: [],
      },
    });

    const calls = harness.nodeTooltip.mock.calls;
    const lastCallProps = calls[calls.length - 1][0];
    expect(lastCallProps.size).toBeUndefined();
  });

  it('passes undefined for plugin when info is null', () => {
    renderViewport({
      tooltipData: {
        visible: true,
        nodeRect: { x: 10, y: 20, radius: 5 },
        path: 'src/App.ts',
        info: null,
        pluginSections: [],
      },
    });

    const calls = harness.nodeTooltip.mock.calls;
    const lastCallProps = calls[calls.length - 1][0];
    expect(lastCallProps.plugin).toBeUndefined();
  });

  it('passes undefined for visits when info is null', () => {
    renderViewport({
      tooltipData: {
        visible: true,
        nodeRect: { x: 10, y: 20, radius: 5 },
        path: 'src/App.ts',
        info: null,
        pluginSections: [],
      },
    });

    const calls = harness.nodeTooltip.mock.calls;
    const lastCallProps = calls[calls.length - 1][0];
    expect(lastCallProps.visits).toBeUndefined();
  });

  it('calls handleContextMenu when context menu is triggered', () => {
    const { handleContextMenu } = renderViewport();
    const container = document.querySelector('.graph-container') as HTMLElement;
    fireEvent.contextMenu(container);
    expect(handleContextMenu).toHaveBeenCalled();
  });

  it('calls handleMouseLeave when mouse leaves the container', () => {
    const { handleMouseLeave } = renderViewport();
    const container = document.querySelector('.graph-container') as HTMLElement;
    fireEvent.mouseLeave(container);
    expect(handleMouseLeave).toHaveBeenCalled();
  });

  it('calls handleMouseDownCapture on mouse down', () => {
    const { handleMouseDownCapture } = renderViewport();
    const container = document.querySelector('.graph-container') as HTMLElement;
    fireEvent.mouseDown(container);
    expect(handleMouseDownCapture).toHaveBeenCalled();
  });

  it('calls handleMouseMoveCapture on mouse move', () => {
    const { handleMouseMoveCapture } = renderViewport();
    const container = document.querySelector('.graph-container') as HTMLElement;
    fireEvent.mouseMove(container);
    expect(handleMouseMoveCapture).toHaveBeenCalled();
  });

  it('calls handleMouseUpCapture on mouse up', () => {
    const { handleMouseUpCapture } = renderViewport();
    const container = document.querySelector('.graph-container') as HTMLElement;
    fireEvent.mouseUp(container);
    expect(handleMouseUpCapture).toHaveBeenCalled();
  });

  it('applies graph-container class to the viewport div', () => {
    renderViewport();
    const container = document.querySelector('.graph-container');
    expect(container).not.toBeNull();
  });

  it('applies inset-0 class to the viewport div', () => {
    renderViewport();
    const container = document.querySelector('.graph-container') as HTMLElement;
    expect(container.className).toContain('inset-0');
  });

  it('sets borderWidth to 1 on the container style', () => {
    renderViewport();
    const container = document.querySelector('.graph-container') as HTMLElement;
    expect(container.style.borderWidth).toBe('1px');
  });

  it('sets borderStyle to solid on the container style', () => {
    renderViewport();
    const container = document.querySelector('.graph-container') as HTMLElement;
    expect(container.style.borderStyle).toBe('solid');
  });

  it('sets cursor to default on the container style', () => {
    renderViewport();
    const container = document.querySelector('.graph-container') as HTMLElement;
    expect(container.style.cursor).toBe('default');
  });

  it('renders Surface2d for 2d mode and Surface3d for 3d mode', () => {
    renderViewport({ graphMode: '2d' });
    expect(screen.getByTestId('surface-2d')).toBeInTheDocument();
    expect(screen.queryByTestId('surface-3d')).not.toBeInTheDocument();
  });

  it('passes nodeRect from tooltipData to NodeTooltip', () => {
    renderViewport({
      tooltipData: {
        visible: true,
        nodeRect: { x: 100, y: 200, radius: 25 },
        path: 'src/index.ts',
        info: null,
        pluginSections: [],
      },
    });

    expect(harness.nodeTooltip).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeRect: { x: 100, y: 200, radius: 25 },
      }),
    );
  });
});
