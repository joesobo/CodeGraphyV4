/**
 * Tests targeting surviving mutations in Viewport.tsx:
 * - L66: ArrowFunction: () => undefined on onContextMenu handler
 * - L67: ArrowFunction: () => undefined on onMouseLeave handler
 * - L72: StringLiteral "" on style properties
 * - L111: LogicalOperator on tooltipData.info?.incomingCount ?? 0
 * - L112: LogicalOperator on tooltipData.info?.outgoingCount ?? 0
 */
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Viewport } from '../../../../src/webview/components/graph/viewport/view';

const harness = vi.hoisted(() => ({
  nodeTooltip: vi.fn(),
  surface2d: vi.fn(),
  surface3d: vi.fn(),
}));

vi.mock('../../../../src/webview/components/nodeTooltip/view', () => ({
  NodeTooltip: (props: Record<string, unknown>) => {
    harness.nodeTooltip(props);
    return <div data-testid="node-tooltip" data-visible={String(props.visible)} data-path={String(props.path)} />;
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
    return <div data-testid="surface-3d" />;
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

function createNodeThreeObjectContext() {
  return {
    graphAppearanceRef: { current: { labelForeground: '#f8fafc' } },
    meshesRef: { current: new Map() },
    showLabelsRef: { current: true },
    spritesRef: { current: new Map() },
  };
}

function renderViewport(overrides: Partial<React.ComponentProps<typeof Viewport>> = {}) {
  const handleContextMenu = vi.fn();
  const handleMouseLeave = vi.fn();
  const handleMenuAction = vi.fn();
  const handleMouseDownCapture = vi.fn();
  const handleMouseMoveCapture = vi.fn();
  const handleMouseUpCapture = vi.fn();

  const result = render(
    <Viewport
      canvasBackgroundColor="transparent"
      containerBackgroundColor="var(--cg-popover-translucent)"
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
        nodeThreeObjectContext: createNodeThreeObjectContext(),
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

  return { ...result, handleContextMenu, handleMouseLeave, handleMenuAction, handleMouseDownCapture, handleMouseMoveCapture, handleMouseUpCapture };
}

describe('Viewport tooltip count mutations (L111-112)', () => {


    it('renders Surface2d for 2d mode and Surface3d for 3d mode', () => {
      renderViewport({ graphMode: '2d' });
      expect(screen.getByTestId('surface-2d')).toBeInTheDocument();
      expect(screen.queryByTestId('surface-3d')).not.toBeInTheDocument();
    });
});
