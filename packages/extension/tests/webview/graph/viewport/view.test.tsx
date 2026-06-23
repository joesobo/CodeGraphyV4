import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphContextMenuEntry } from '../../../../src/webview/components/graph/contextMenu/contracts';
import type { FGLink, FGNode } from '../../../../src/webview/components/graph/model/build';
import type { GraphSurfaceSharedProps } from '../../../../src/webview/components/graph/rendering/surface/sharedProps';
import { Viewport } from '../../../../src/webview/components/graph/viewport/view';

const harness = vi.hoisted(() => ({
  nodeTooltip: vi.fn(),
  surface2d: vi.fn(),
  surface3d: vi.fn(),
  throwSurface3d: false,
}));

vi.mock('../../../../src/webview/components/nodeTooltip/view', () => ({
  NodeTooltip: (props: Record<string, unknown>) => {
    harness.nodeTooltip(props);
    return <div data-testid="node-tooltip">{String(props.path)}</div>;
  },
}));

vi.mock('../../../../src/webview/components/graph/rendering/surface/view/twoDimensional', () => ({
  Surface2d: (props: Record<string, unknown>) => {
    harness.surface2d(props);
    return <div data-testid="surface-2d" />;
  },
}));

vi.mock('../../../../src/webview/components/graph/rendering/surface/view/threeDimensional', () => ({
  DeferredSurface3d: (props: Record<string, unknown>) => {
    harness.surface3d(props);
    if (harness.throwSurface3d) {
      throw new Error('Error creating WebGL context.');
    }
    return <div data-testid="surface-3d" />;
  },
}));

vi.mock('../../../../src/webview/components/ui/context/menu', () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuContent: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  ContextMenuItem: ({
    children,
    onClick,
    onSelect,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    onSelect?: () => void;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      {...props}
      onClick={() => {
        onClick?.();
        onSelect?.();
      }}
    >
      {children}
    </button>
  ),
  ContextMenuSeparator: () => <hr data-testid="separator" />,
  ContextMenuShortcut: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

function createMenuEntries(): GraphContextMenuEntry[] {
  const contextSelection = { kind: 'node' as const, targets: ['src/app.ts'] };
  return [
    {
      id: 'open',
      kind: 'item',
      label: 'Open file',
      action: { kind: 'builtin', action: 'open' },
      contextSelection,
      destructive: false,
      shortcut: 'Enter',
    },
    {
      id: 'separator',
      kind: 'separator',
    },
  ];
}

function createSharedProps(): GraphSurfaceSharedProps {
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
    onNodeDrag: vi.fn(),
    onNodeDragEnd: vi.fn(),
    onNodeHover: vi.fn(),
    onNodeRightClick: vi.fn(),
    warmupTicks: 0,
    width: 300,
  };
}

function createGraphNode(id: string): FGNode {
  return {
    id,
    label: id,
    size: 24,
    color: '#22c55e',
    borderColor: '#111827',
    borderWidth: 1,
    baseOpacity: 1,
    isFavorite: false,
    isPinned: false,
  };
}

function createGraphLink(id: string, source: string, target: string): FGLink {
  return {
    id,
    from: source,
    to: target,
    source,
    target,
    bidirectional: false,
  };
}

function createSurface2dProps(
  sharedProps = createSharedProps(),
): React.ComponentProps<typeof Viewport>['surface2dProps'] {
  return {
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
    sharedProps,
  };
}

function createSurface3dProps(
  sharedProps = createSharedProps(),
): React.ComponentProps<typeof Viewport>['surface3dProps'] {
  return {
    fg3dRef: { current: undefined },
    getArrowColor: vi.fn(),
    getLinkColor: vi.fn(),
    getLinkParticles: vi.fn(),
    getLinkWidth: vi.fn(),
    getParticleColor: vi.fn(),
    nodeThreeObject: vi.fn(),
    particleSize: 2,
    particleSpeed: 0.1,
    sharedProps,
  };
}

function renderViewport(overrides: Partial<React.ComponentProps<typeof Viewport>> = {}): {
  handleMenuAction: ReturnType<typeof vi.fn>;
} {
  const handleMenuAction = vi.fn();

  render(
    <Viewport
      canvasBackgroundColor="transparent"
      containerBackgroundColor="var(--cg-popover-translucent)"
      borderColor="#222222"
      containerRef={{ current: document.createElement('div') }}
      directionMode="arrows"
      graphMode="2d"
      handleContextMenu={vi.fn()}
      handleMenuAction={handleMenuAction}
      handleMouseDownCapture={vi.fn()}
      handleMouseLeave={vi.fn()}
      handleMouseMoveCapture={vi.fn()}
      handleMouseUpCapture={vi.fn()}
      menuEntries={createMenuEntries()}
      surface2dProps={createSurface2dProps()}
      surface3dProps={createSurface3dProps()}
      tooltipData={{
        visible: true,
        nodeRect: { x: 10, y: 20, radius: 30 },
        path: 'src/App.ts',
        info: null,
        pluginSections: [],
      }}
      {...overrides}
    />,
  );

  return { handleMenuAction };
}

describe('Viewport', () => {
  beforeEach(() => {
    harness.nodeTooltip.mockClear();
    harness.surface2d.mockClear();
    harness.surface3d.mockClear();
    harness.throwSurface3d = false;
  });

  it('falls back to the 2d surface when the 3d surface throws', async () => {
    harness.throwSurface3d = true;
    const onSurface3dError = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderViewport({ graphMode: '3d', onSurface3dError });

    await waitFor(() => {
      expect(screen.getByTestId('surface-2d')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('surface-3d')).not.toBeInTheDocument();
    expect(onSurface3dError).toHaveBeenCalledWith(expect.any(Error));

    harness.throwSurface3d = false;
    consoleError.mockRestore();
  });

  it('renders the 2d graph surface and forwards tooltip data', () => {
    renderViewport();

    expect(screen.getByTestId('surface-2d')).toBeInTheDocument();
    expect(screen.queryByTestId('surface-3d')).not.toBeInTheDocument();
    expect(harness.surface2d).toHaveBeenCalledWith(
      expect.objectContaining({
        backgroundColor: 'transparent',
        directionMode: 'arrows',
        particleSize: 2,
      }),
    );
    expect(harness.nodeTooltip).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'src/App.ts',
        visible: true,
      }),
    );
  });

  it('does not rerender the 2d graph surface when only viewport overlays change', () => {
    const surface2dProps = createSurface2dProps();
    const surface3dProps = createSurface3dProps(surface2dProps.sharedProps);
    const { rerender } = render(
      <Viewport
        accessibilityItems={{ nodes: [], edges: [] }}
        canvasBackgroundColor="transparent"
        containerBackgroundColor="var(--cg-popover-translucent)"
        borderColor="#222222"
        containerRef={{ current: document.createElement('div') }}
        directionMode="arrows"
        graphMode="2d"
        handleContextMenu={vi.fn()}
        handleMenuAction={vi.fn()}
        handleMouseDownCapture={vi.fn()}
        handleMouseLeave={vi.fn()}
        handleMouseMoveCapture={vi.fn()}
        handleMouseUpCapture={vi.fn()}
        menuEntries={createMenuEntries()}
        surface2dProps={surface2dProps}
        surface3dProps={surface3dProps}
        tooltipData={{ visible: false, nodeRect: { x: 0, y: 0, radius: 0 }, path: '', info: null, pluginSections: [] }}
      />,
    );

    expect(harness.surface2d).toHaveBeenCalledTimes(1);

    rerender(
      <Viewport
        accessibilityItems={{ nodes: [], edges: [{ kind: 'edge', id: 'edge-a', label: 'Edge A' }] }}
        canvasBackgroundColor="transparent"
        containerBackgroundColor="var(--cg-popover-translucent)"
        borderColor="#222222"
        containerRef={{ current: document.createElement('div') }}
        directionMode="arrows"
        graphMode="2d"
        handleContextMenu={vi.fn()}
        handleMenuAction={vi.fn()}
        handleMouseDownCapture={vi.fn()}
        handleMouseLeave={vi.fn()}
        handleMouseMoveCapture={vi.fn()}
        handleMouseUpCapture={vi.fn()}
        menuEntries={createMenuEntries()}
        surface2dProps={surface2dProps}
        surface3dProps={surface3dProps}
        tooltipData={{ visible: true, nodeRect: { x: 1, y: 2, radius: 3 }, path: 'src/next.ts', info: null, pluginSections: [] }}
      />,
    );

    expect(harness.surface2d).toHaveBeenCalledTimes(1);
    expect(harness.nodeTooltip).toHaveBeenCalledWith(expect.objectContaining({
      path: 'src/next.ts',
      visible: true,
    }));
  });

  it('renders the 3d graph surface when graphMode is 3d', async () => {
    renderViewport({ graphMode: '3d' });

    await waitFor(() => {
      expect(screen.getByTestId('surface-3d')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('surface-2d')).not.toBeInTheDocument();
  });

  it('dispatches menu actions for item entries', () => {
    const { handleMenuAction } = renderViewport();

    fireEvent.click(screen.getByRole('button', { name: /open file/i }));

    expect(handleMenuAction).toHaveBeenCalledWith({
      action: { kind: 'builtin', action: 'open' },
      contextSelection: { kind: 'node', targets: ['src/app.ts'] },
    });
    expect(screen.getByTestId('separator')).toBeInTheDocument();
  });

  it('changes the context menu signature when an entry label changes', () => {
    const contextSelection = { kind: 'node' as const, targets: ['src/app.ts'] };
    const addFavoriteEntry: GraphContextMenuEntry = {
      id: 'node-toggle-favorite',
      kind: 'item',
      label: 'Add to Favorites',
      action: { kind: 'builtin', action: 'toggleFavorite' },
      contextSelection,
    };
    const removeFavoriteEntry: GraphContextMenuEntry = {
      ...addFavoriteEntry,
      label: 'Remove from Favorites',
    };
    const { rerender } = render(
      <Viewport
        canvasBackgroundColor="transparent"
        containerBackgroundColor="var(--cg-popover-translucent)"
        borderColor="#222222"
        containerRef={{ current: document.createElement('div') }}
        directionMode="arrows"
        graphMode="2d"
        handleContextMenu={vi.fn()}
        handleMenuAction={vi.fn()}
        handleMouseDownCapture={vi.fn()}
        handleMouseLeave={vi.fn()}
        handleMouseMoveCapture={vi.fn()}
        handleMouseUpCapture={vi.fn()}
        menuEntries={[addFavoriteEntry]}
        surface2dProps={createSurface2dProps()}
        surface3dProps={createSurface3dProps()}
        tooltipData={{ visible: false, nodeRect: { x: 0, y: 0, radius: 0 }, path: '', info: null, pluginSections: [] }}
      />,
    );

    expect(document.querySelector('[data-menu-entries-signature]')).toHaveAttribute(
      'data-menu-entries-signature',
      'node-toggle-favorite:Add to Favorites',
    );

    rerender(
      <Viewport
        canvasBackgroundColor="transparent"
        containerBackgroundColor="var(--cg-popover-translucent)"
        borderColor="#222222"
        containerRef={{ current: document.createElement('div') }}
        directionMode="arrows"
        graphMode="2d"
        handleContextMenu={vi.fn()}
        handleMenuAction={vi.fn()}
        handleMouseDownCapture={vi.fn()}
        handleMouseLeave={vi.fn()}
        handleMouseMoveCapture={vi.fn()}
        handleMouseUpCapture={vi.fn()}
        menuEntries={[removeFavoriteEntry]}
        surface2dProps={createSurface2dProps()}
        surface3dProps={createSurface3dProps()}
        tooltipData={{ visible: false, nodeRect: { x: 0, y: 0, radius: 0 }, path: '', info: null, pluginSections: [] }}
      />,
    );

    expect(document.querySelector('[data-menu-entries-signature]')).toHaveAttribute(
      'data-menu-entries-signature',
      'node-toggle-favorite:Remove from Favorites',
    );
    expect(screen.getByRole('button', { name: 'Remove from Favorites' })).toBeInTheDocument();
  });

  it('opens the graph node context menu from the accessible node item', () => {
    const handleNodeContextMenu = vi.fn();
    const node = createGraphNode('src/app.ts');
    const sharedProps = createSharedProps();
    sharedProps.graphData = { nodes: [node], links: [] };

    renderViewport({
      accessibilityItems: {
        nodes: [{
          kind: 'node',
          id: 'src/app.ts',
          label: 'Graph node src/app.ts',
          radius: 24,
          x: 50,
          y: 60,
        }],
        edges: [],
      },
      handleNodeContextMenu,
      surface2dProps: createSurface2dProps(sharedProps),
      surface3dProps: createSurface3dProps(sharedProps),
    });

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Graph node src/app.ts' }));

    expect(handleNodeContextMenu).toHaveBeenCalledWith('src/app.ts', expect.any(MouseEvent));
  });

  it('opens the graph edge context menu from the accessible edge item', () => {
    const handleEdgeContextMenu = vi.fn();
    const edge = createGraphLink('edge-src-app-src-types', 'src/app.ts', 'src/types.ts');
    const sharedProps = createSharedProps();
    sharedProps.graphData = {
      nodes: [createGraphNode('src/app.ts'), createGraphNode('src/types.ts')],
      links: [edge],
    };

    renderViewport({
      accessibilityItems: {
        nodes: [],
        edges: [{
          kind: 'edge',
          id: 'edge-src-app-src-types',
          label: 'Graph edge src/app.ts to src/types.ts',
        }],
      },
      handleEdgeContextMenu,
      surface2dProps: createSurface2dProps(sharedProps),
      surface3dProps: createSurface3dProps(sharedProps),
    });

    fireEvent.contextMenu(screen.getByLabelText('Graph edge src/app.ts to src/types.ts'));

    expect(handleEdgeContextMenu).toHaveBeenCalledWith(edge, expect.any(MouseEvent));
  });

  it('hosts Graph View stage slots separately for background, world, and viewport overlays', () => {
    const pluginHost = {
      attachSlotHost: vi.fn(),
      detachSlotHost: vi.fn(),
    };

    renderViewport({ pluginHost: pluginHost as never });

    expect(pluginHost.attachSlotHost).toHaveBeenCalledWith(
      'graph.stage.worldBackground',
      expect.any(HTMLDivElement),
    );
    expect(pluginHost.attachSlotHost).toHaveBeenCalledWith(
      'graph.stage.worldOverlay',
      expect.any(HTMLDivElement),
    );
    expect(pluginHost.attachSlotHost).toHaveBeenCalledWith(
      'graph.stage.viewportOverlay',
      expect.any(HTMLDivElement),
    );
  });
});
