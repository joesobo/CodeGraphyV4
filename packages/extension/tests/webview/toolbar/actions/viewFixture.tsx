import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { TooltipProvider } from '../../../../src/webview/components/ui/overlay/tooltip';
import { graphStore } from '../../../../src/webview/store/state';

vi.mock('../../../../src/webview/components/ui/menus/dropdown-menu', () => {
  const DropdownMenuTrigger = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
    ({ children }, ref) => <div ref={ref}>{children}</div>,
  );
  DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

  const DropdownMenuContent = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
    ({ children }, ref) => <div ref={ref} data-testid="dropdown-content">{children}</div>,
  );
  DropdownMenuContent.displayName = 'DropdownMenuContent';

  const DropdownMenuItem = React.forwardRef<
    HTMLButtonElement,
    { children: React.ReactNode; className?: string; disabled?: boolean; onSelect?: () => void }
  >(({ children, className, disabled, onSelect }, ref) => (
    <button ref={ref} type="button" className={className} disabled={disabled} onClick={onSelect}>
      {children}
    </button>
  ));
  DropdownMenuItem.displayName = 'DropdownMenuItem';

  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
    DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
      <span data-testid="dropdown-label">{children}</span>
    ),
  };
});

import { ToolbarActions } from '../../../../src/webview/components/toolbar/actions/view';

export const iconButtonTitles = [
  'Index Workspace',
  'Node Size',
  'New...',
  'Graph Scope',
  'Themes',
  'Plugins',
  'Settings',
] as const;

export function renderToolbar(props: Partial<React.ComponentProps<typeof ToolbarActions>> = {}) {
  return render(
    <TooltipProvider>
      <ToolbarActions {...props} />
    </TooltipProvider>,
  );
}

export function resetToolbarState(): void {
  vi.clearAllMocks();
  vi.useFakeTimers();
  graphStore.setState({
    activePanel: 'none',
    pluginExporters: [],
    pluginToolbarActions: [],
    graphHasIndex: false,
    graphIndexFreshness: 'missing',
    graphIndexDetail: null,
    graphIsIndexing: false,
    graphIndexProgress: null,
    nodeSizeMode: 'connections',
    graphViewportScale: null,
    graphViewContributionStatuses: [],
  });
}

export function enableRuntimeGraphViewContributions(): void {
  graphStore.setState({
    graphViewContributionStatuses: [
      {
        kind: 'runtimeNodes',
        pluginId: 'acme.graph-tools',
        contributionId: 'acme.graph-tools.runtime-nodes',
        label: 'Runtime Nodes',
      },
      {
        kind: 'projections',
        pluginId: 'acme.graph-tools',
        contributionId: 'acme.graph-tools.projection',
        label: 'Runtime Projection',
      },
    ],
  });
}

export function clickToolbarAction(title: string): void {
  fireEvent.click(screen.getByTitle(title));
}
