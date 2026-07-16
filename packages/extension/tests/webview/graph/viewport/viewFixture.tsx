import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import type { GraphContextMenuEntry } from '../../../../src/webview/components/graph/contextMenu/contracts';
import type { FGLink, FGNode } from '../../../../src/webview/components/graph/model/build';
import type { GraphSurfaceSharedProps } from '../../../../src/webview/components/graph/rendering/surface/sharedProps';
import { Viewport } from '../../../../src/webview/components/graph/viewport/view';
import { createDefaultViewportSurfaceProps } from '../rendering/surface/owned2d/view/surface/fixture';

const viewHarness = vi.hoisted(() => ({
  nodeTooltip: vi.fn(),
  surface2d: vi.fn(),
}));

vi.mock('../../../../src/webview/components/nodeTooltip/view', () => ({
  NodeTooltip: (props: Record<string, unknown>) => {
    viewHarness.nodeTooltip(props);
    return <div data-testid="node-tooltip">{String(props.path)}</div>;
  },
}));

vi.mock('../../../../src/webview/components/graph/rendering/surface/owned2d/view/surface/render', () => ({
  OwnedGraphSurface2d: (props: Record<string, unknown>) => {
    viewHarness.surface2d(props);
    return <div data-testid="surface-2d" />;
  },
}));

vi.mock('../../../../src/webview/components/ui/context/menu', () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuContent: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  ContextMenuItem: ({
    children, onClick, onSelect, ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    onSelect?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" {...props} onClick={() => { onClick?.(); onSelect?.(); }}>
      {children}
    </button>
  ),
  ContextMenuSeparator: () => <hr data-testid="separator" />,
  ContextMenuShortcut: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

export function createMenuEntries(): GraphContextMenuEntry[] {
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
    { id: 'separator', kind: 'separator' },
  ];
}

export function createSharedProps(): GraphSurfaceSharedProps {
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

export function createGraphNode(id: string): FGNode {
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

export function createGraphLink(id: string, source: string, target: string): FGLink {
  return { id, from: source, to: target, source, target, bidirectional: false };
}

export function createSurface2dProps(
  sharedProps = createSharedProps(),
): React.ComponentProps<typeof Viewport>['surface2dProps'] {
  return {
    ...createDefaultViewportSurfaceProps(),
    particleSize: 2,
    particleSpeed: 0.1,
    sharedProps,
  };
}

export function defaultViewportProps(): React.ComponentProps<typeof Viewport> {
  return {
    canvasBackgroundColor: 'transparent',
    containerBackgroundColor: 'var(--cg-popover-translucent)',
    containerRef: { current: document.createElement('div') },
    directionMode: 'arrows',
    handleContextMenu: vi.fn(),
    handleMenuAction: vi.fn(),
    handleMouseDownCapture: vi.fn(),
    handleMouseLeave: vi.fn(),
    handleMouseMoveCapture: vi.fn(),
    handleMouseUpCapture: vi.fn(),
    menuEntries: createMenuEntries(),
    surface2dProps: createSurface2dProps(),
    tooltipData: {
      visible: true,
      nodeRect: { x: 10, y: 20, radius: 30 },
      path: 'src/App.ts',
      info: null,
      pluginSections: [],
    },
  };
}

export function renderViewport(overrides: Partial<React.ComponentProps<typeof Viewport>> = {}) {
  const props = { ...defaultViewportProps(), ...overrides };
  const rendered = render(<Viewport {...props} />);
  return {
    ...rendered,
    props,
    rerenderViewport(nextOverrides: Partial<React.ComponentProps<typeof Viewport>>): void {
      rendered.rerender(<Viewport {...props} {...nextOverrides} />);
    },
  };
}

export function resetViewHarness(): void {
  viewHarness.nodeTooltip.mockClear();
  viewHarness.surface2d.mockClear();
}

export function getViewHarness(): typeof viewHarness {
  return viewHarness;
}
