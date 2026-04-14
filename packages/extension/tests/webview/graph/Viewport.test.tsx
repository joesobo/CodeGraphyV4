import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GraphContextMenuEntry } from '../../../src/webview/components/graph/contextMenu/contracts';
import { Viewport } from '../../../src/webview/components/graph/Viewport';

const harness = vi.hoisted(() => ({
  nodeTooltip: vi.fn(),
  surface2d: vi.fn(),
  surface3d: vi.fn(),
  throwSurface3d: false,
}));

vi.mock('../../../src/webview/components/NodeTooltip', () => ({
  NodeTooltip: (props: Record<string, unknown>) => {
    harness.nodeTooltip(props);
    return <div data-testid="node-tooltip">{String(props.path)}</div>;
  },
}));

vi.mock('../../../src/webview/components/graph/rendering/surface/view2d', () => ({
  Surface2d: (props: Record<string, unknown>) => {
    harness.surface2d(props);
    return <div data-testid="surface-2d" />;
  },
}));

vi.mock('../../../src/webview/components/graph/rendering/surface/view3d', () => ({
  DeferredSurface3d: (props: Record<string, unknown>) => {
    harness.surface3d(props);
    if (harness.throwSurface3d) {
      throw new Error('Error creating WebGL context.');
    }
    return <div data-testid="surface-3d" />;
  },
}));

vi.mock('../../../src/webview/components/ui/context/menu', () => ({
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

function createMenuEntries(): GraphContextMenuEntry[] {
  return [
    {
      id: 'open',
      kind: 'item',
      label: 'Open file',
      action: { kind: 'builtin', action: 'open' },
      destructive: false,
      shortcut: 'Enter',
    },
    {
      id: 'separator',
      kind: 'separator',
    },
  ];
}

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

function renderViewport(overrides: Partial<React.ComponentProps<typeof Viewport>> = {}): {
  handleMenuAction: ReturnType<typeof vi.fn>;
} {
  const handleMenuAction = vi.fn();

  render(
    <Viewport
      backgroundColor="#111111"
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
        backgroundColor: '#111111',
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

    expect(handleMenuAction).toHaveBeenCalledWith({ kind: 'builtin', action: 'open' });
    expect(screen.getByTestId('separator')).toBeInTheDocument();
  });
});
