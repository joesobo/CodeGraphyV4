import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../src/webview/components/ui/overlay/tooltip', async () => {
  const React = await import('react');

  function TooltipProvider({ children }: React.PropsWithChildren): React.ReactElement {
    return <>{children}</>;
  }

  function Tooltip({ children }: React.PropsWithChildren): React.ReactElement {
    return <>{children}</>;
  }

  function TooltipTrigger({
    asChild: _asChild,
    children,
  }: React.PropsWithChildren<{ asChild?: boolean }>): React.ReactElement {
    return React.Children.only(children) as React.ReactElement;
  }

  function TooltipContent({
    children,
    side: _side,
    sideOffset: _sideOffset,
    ...props
  }: React.PropsWithChildren<{
    className?: string;
    side?: string;
    sideOffset?: number;
  }>): React.ReactElement {
    return (
      <div role="tooltip" {...props}>
        {children}
      </div>
    );
  }

  return { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
});

import Toolbar from '../../src/webview/components/Toolbar';
import { graphStore } from '../../src/webview/store/state';
import { clearSentMessages, findMessage } from '../helpers/sentMessages';

const mockViews = [
  { id: 'codegraphy.connections', name: 'Connections', icon: 'symbol-file', description: 'Shows all files', active: true },
  { id: 'codegraphy.depth-graph', name: 'Depth Graph', icon: 'target', description: 'Focus on current file', active: false },
  { id: 'codegraphy.folder', name: 'Folder', icon: 'folder', description: 'Shows folder hierarchy', active: false },
];

function setDefaultState(overrides: Record<string, unknown> = {}) {
  graphStore.setState({
    availableViews: mockViews,
    activeViewId: 'codegraphy.connections',
    dagMode: null,
    graphMode: '2d',
    depthLimit: 1,
    activePanel: 'none',
    pluginExporters: [],
    pluginToolbarActions: [],
    graphHasIndex: false,
    isIndexing: false,
    ...overrides,
  });
}

/**
 * Helper to get button groups from the toolbar DOM using data-testid attributes.
 * Layout: [view-buttons] [dag-buttons] [2d/3d] [node-size-buttons] | [refresh] [plugin-action] [export] [plugins] [settings]
 */
function getButtonGroups(container: HTMLElement) {
  const viewGroup = container.querySelector('[data-testid="view-buttons"]');
  const dagGroup = container.querySelector('[data-testid="dag-buttons"]');
  const nodeSizeGroup = container.querySelector('[data-testid="node-size-buttons"]');
  return {
    viewButtons: viewGroup ? Array.from(viewGroup.querySelectorAll('button')) : [],
    dagButtons: dagGroup ? Array.from(dagGroup.querySelectorAll('button')) : [],
    nodeSizeButtons: nodeSizeGroup ? Array.from(nodeSizeGroup.querySelectorAll('button')) : [],
  };
}

describe('Toolbar', () => {
  beforeEach(() => {
    clearSentMessages();
    setDefaultState();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('layout', () => {
    it('renders a vertical transparent toolbar with top and bottom groups', () => {
      const { container } = render(<Toolbar />);
      const toolbar = container.querySelector('[data-testid="toolbar"]') as HTMLElement | null;
      const topGroup = container.querySelector('[data-testid="toolbar-top-group"]') as HTMLElement | null;
      const bottomGroup = container.querySelector('[data-testid="toolbar-bottom-group"]') as HTMLElement | null;
      const viewButtons = container.querySelector('[data-testid="view-buttons"]') as HTMLElement | null;
      const dagButtons = container.querySelector('[data-testid="dag-buttons"]') as HTMLElement | null;
      const nodeSizeButtons = container.querySelector('[data-testid="node-size-buttons"]') as HTMLElement | null;

      expect(toolbar).toBeTruthy();
      expect(toolbar?.className).toContain('flex-col');
      expect(toolbar?.className).toContain('items-center');
      expect(toolbar?.className).toContain('bg-transparent');
      expect(toolbar?.className).not.toContain('py-1');
      expect(toolbar?.className).not.toContain('rounded-md');
      expect(toolbar?.className).not.toContain('border');
      expect(toolbar?.className).not.toContain('shadow-lg');
      expect(topGroup).toBeTruthy();
      expect(bottomGroup).toBeTruthy();
      expect(topGroup?.className).toContain('flex-col');
      expect(bottomGroup?.className).toContain('flex-col');
      expect(topGroup?.querySelector('[data-testid="view-buttons"]')).toBeTruthy();
      expect(topGroup?.querySelector('[data-testid="dag-buttons"]')).toBeTruthy();
      expect(topGroup?.querySelector('[data-testid="node-size-buttons"]')).toBeTruthy();
      expect(viewButtons?.className).toContain('flex-col');
      expect(viewButtons?.className).not.toContain('bg-popover/80');
      expect(viewButtons?.className).not.toContain('border');
      expect(dagButtons?.className).toContain('flex-col');
      expect(dagButtons?.className).not.toContain('bg-popover/80');
      expect(dagButtons?.className).not.toContain('border');
      expect(nodeSizeButtons?.className).toContain('flex-col');
      expect(nodeSizeButtons?.className).not.toContain('bg-popover/80');
      expect(nodeSizeButtons?.className).not.toContain('border');
      expect(screen.getByTitle('Index Repo').closest('[data-testid="toolbar-bottom-group"]')).toBe(bottomGroup);
      expect(screen.getByTitle('Settings').closest('[data-testid="toolbar-bottom-group"]')).toBe(bottomGroup);
      expect(screen.getByTitle('Legends').closest('[data-testid="toolbar-bottom-group"]')).toBe(bottomGroup);
    });

    it('renders a collapse toggle at the bottom of the top toolbar group', () => {
      const { container } = render(<Toolbar />);
      const topGroup = container.querySelector('[data-testid="toolbar-top-group"]') as HTMLElement | null;
      const controls = container.querySelector('[data-testid="toolbar-primary-controls"]') as HTMLElement | null;
      const collapseTrigger = screen.getByRole('button', { name: 'Collapse Toolbar' });

      expect(collapseTrigger.closest('[data-testid="toolbar-top-group"]')).toBe(topGroup);
      expect(collapseTrigger).toHaveAttribute('title', 'Collapse Toolbar');
      expect(topGroup).toContainElement(collapseTrigger);
      expect(controls).toHaveClass(
        'overflow-hidden',
        'transition-[max-height,opacity,margin,transform]',
        'duration-200',
        'ease-out',
        'mb-1.5',
        'max-h-96',
        'opacity-100',
        'translate-y-0',
      );
      expect(screen.getAllByText('Collapse Toolbar').length).toBeGreaterThanOrEqual(1);
    });

    it('collapses only the top toolbar controls and keeps the bottom actions visible', () => {
      const { container } = render(<Toolbar />);
      const controls = container.querySelector('[data-testid="toolbar-primary-controls"]') as HTMLElement | null;

      fireEvent.click(screen.getByRole('button', { name: 'Collapse Toolbar' }));

      expect(screen.getByRole('button', { name: 'Expand Toolbar' })).toHaveAttribute('title', 'Expand Toolbar');
      expect(controls).toHaveClass(
        'overflow-hidden',
        'transition-[max-height,opacity,margin,transform]',
        'duration-200',
        'ease-out',
        'mb-0',
        'max-h-0',
        'opacity-0',
        '-translate-y-1',
        'pointer-events-none',
      );
      expect(screen.getAllByText('Expand Toolbar').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTitle('Index Repo')).toBeTruthy();
      expect(screen.getByTitle('Settings')).toBeTruthy();
    });
  });

  describe('view buttons', () => {
    it('renders a button for each available view', () => {
      const { container } = render(<Toolbar />);
      const { viewButtons } = getButtonGroups(container);
      expect(viewButtons).toHaveLength(mockViews.length);
    });

    it('sends CHANGE_VIEW with correct viewId when view button is clicked', () => {
      const { container } = render(<Toolbar />);
      const { viewButtons } = getButtonGroups(container);
      // Click the second view button (Depth Graph)
      fireEvent.click(viewButtons[1]);
      const msg = findMessage('CHANGE_VIEW');
      expect(msg).toBeTruthy();
      expect(msg!.payload.viewId).toBe('codegraphy.depth-graph');
    });

    it('active view button has default variant', () => {
      const { container } = render(<Toolbar />);
      const { viewButtons } = getButtonGroups(container);
      // First button (Connections) is active — should NOT have ghost class
      expect(viewButtons[0].className).not.toContain('hover:bg-accent');
      // Second button should have ghost variant
      expect(viewButtons[1].className).toContain('hover:bg-accent');
    });
  });

  describe('DAG mode buttons', () => {
    it('renders all four DAG mode buttons', () => {
      const { container } = render(<Toolbar />);
      const { dagButtons } = getButtonGroups(container);
      expect(dagButtons).toHaveLength(4);
    });

    it('sends UPDATE_DAG_MODE when a DAG button is clicked', () => {
      const { container } = render(<Toolbar />);
      const { dagButtons } = getButtonGroups(container);
      // Click "Radial Out" (index 1 in DAG_MODES: [null, radialout, td, lr])
      fireEvent.click(dagButtons[1]);
      const msg = findMessage('UPDATE_DAG_MODE');
      expect(msg).toBeTruthy();
      expect(msg!.payload.dagMode).toBe('radialout');
    });

    it('sends null dagMode when Default button is clicked', () => {
      setDefaultState({ dagMode: 'td' });
      const { container } = render(<Toolbar />);
      const { dagButtons } = getButtonGroups(container);
      fireEvent.click(dagButtons[0]);
      const msg = findMessage('UPDATE_DAG_MODE');
      expect(msg).toBeTruthy();
      expect(msg!.payload.dagMode).toBeNull();
    });

    it('active DAG mode button has default variant', () => {
      setDefaultState({ dagMode: 'td' });
      const { container } = render(<Toolbar />);
      const { dagButtons } = getButtonGroups(container);
      // "Top Down" is index 2 — should be active (not ghost)
      expect(dagButtons[2].className).not.toContain('hover:bg-accent');
      // Others should be ghost
      expect(dagButtons[0].className).toContain('hover:bg-accent');
      expect(dagButtons[1].className).toContain('hover:bg-accent');
      expect(dagButtons[3].className).toContain('hover:bg-accent');
    });
  });

  describe('2D/3D toggle', () => {
    it('toggles graphMode from 2d to 3d', () => {
      render(<Toolbar />);
      fireEvent.click(screen.getByTitle('Toggle 2D/3D Mode'));
      expect(graphStore.getState().graphMode).toBe('3d');
    });

    it('toggles graphMode from 3d back to 2d', () => {
      setDefaultState({ graphMode: '3d' });
      render(<Toolbar />);
      fireEvent.click(screen.getByTitle('Toggle 2D/3D Mode'));
      expect(graphStore.getState().graphMode).toBe('2d');
    });
  });

  describe('node size mode buttons', () => {
    it('renders all four node size mode buttons', () => {
      const { container } = render(<Toolbar />);
      const { nodeSizeButtons } = getButtonGroups(container);
      expect(nodeSizeButtons).toHaveLength(4);
    });

    it('active node size mode button has default variant', () => {
      setDefaultState({ nodeSizeMode: 'file-size' });
      const { container } = render(<Toolbar />);
      const { nodeSizeButtons } = getButtonGroups(container);
      // file-size is index 1 — should be active (not ghost)
      expect(nodeSizeButtons[1].className).not.toContain('hover:bg-accent');
      // Others should be ghost
      expect(nodeSizeButtons[0].className).toContain('hover:bg-accent');
      expect(nodeSizeButtons[2].className).toContain('hover:bg-accent');
      expect(nodeSizeButtons[3].className).toContain('hover:bg-accent');
    });

    it('sends UPDATE_NODE_SIZE_MODE when a node size button is clicked', () => {
      setDefaultState({ nodeSizeMode: 'connections' });
      const { container } = render(<Toolbar />);
      const { nodeSizeButtons } = getButtonGroups(container);
      // Click "Uniform" (index 3)
      fireEvent.click(nodeSizeButtons[3]);
      const msg = findMessage('UPDATE_NODE_SIZE_MODE');
      expect(msg).toBeTruthy();
      expect(msg!.payload.nodeSizeMode).toBe('uniform');
    });
  });

  describe('action buttons', () => {
    it('refresh button sends REFRESH_GRAPH', () => {
      render(<Toolbar />);
      fireEvent.click(screen.getByTitle('Index Repo'));
      expect(findMessage('REFRESH_GRAPH')).toBeTruthy();
    });

    it('shows Refresh Graph when an index already exists', () => {
      setDefaultState({ graphHasIndex: true });

      render(<Toolbar />);

      expect(screen.getByTitle('Refresh Graph')).toBeTruthy();
    });

    it('settings button opens settings panel', () => {
      render(<Toolbar />);
      fireEvent.click(screen.getByTitle('Settings'));
      expect(graphStore.getState().activePanel).toBe('settings');
    });

    it('plugins button opens plugins panel', () => {
      render(<Toolbar />);
      fireEvent.click(screen.getByTitle('Plugins'));
      expect(graphStore.getState().activePanel).toBe('plugins');
    });

    it('legends button opens legends panel', () => {
      render(<Toolbar />);
      fireEvent.click(screen.getByTitle('Legends'));
      expect(graphStore.getState().activePanel).toBe('legends');
    });
  });
});
