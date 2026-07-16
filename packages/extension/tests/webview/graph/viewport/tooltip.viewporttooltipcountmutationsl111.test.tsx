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
import { createDefaultViewportSurfaceProps } from '../rendering/surface/owned2d/view/surface/fixture';

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

vi.mock('../../../../src/webview/components/graph/rendering/surface/owned2d/view/surface/render', () => ({
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

describe('Viewport tooltip count mutations (L111-112)', () => {

    it('passes tooltip info fields when info is provided', () => {
      renderViewport({
        tooltipData: {
          visible: true,
          nodeRect: { x: 50, y: 60, radius: 15 },
          path: 'src/utils.ts',
          info: {
            path: 'src/utils.ts',
            size: 1024,
            lastModified: 1700000000000,
            incomingCount: 3,
            outgoingCount: 5,
            plugin: 'TypeScript',
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
      expect(lastCallProps.outgoingCount).not.toBeUndefined();
      expect(lastCallProps.outgoingCount).not.toBeNull();
    });



    it('passes non-zero incomingCount through from info', () => {
      renderViewport({
        tooltipData: {
          visible: true,
          nodeRect: { x: 10, y: 20, radius: 5 },
          path: 'src/App.ts',
          info: {
            path: 'src/App.ts',
            size: 512,
            lastModified: 1700000000000,
            incomingCount: 7,
            outgoingCount: 2,
          },
          pluginSections: [],
        },
      });

      const calls = harness.nodeTooltip.mock.calls;
      const lastCallProps = calls[calls.length - 1][0];
      expect(lastCallProps.incomingCount).toBe(7);
      expect(lastCallProps.outgoingCount).toBe(2);
    });

    it('prefers visible graph connection counts over file info counts', () => {
      renderViewport({
        tooltipData: {
          visible: true,
          nodeRect: { x: 10, y: 20, radius: 5 },
          path: 'src/App.ts',
          incomingCount: 1,
          outgoingCount: 0,
          info: {
            path: 'src/App.ts',
            size: 512,
            lastModified: 1700000000000,
            incomingCount: 4,
            outgoingCount: 3,
          },
          pluginSections: [],
        },
      });

      const calls = harness.nodeTooltip.mock.calls;
      const lastCallProps = calls[calls.length - 1][0];
      expect(lastCallProps.incomingCount).toBe(1);
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
