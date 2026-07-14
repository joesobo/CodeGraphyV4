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

vi.mock('../../src/webview/components/icons/MdiIcon', () => ({
  MdiIcon: ({ path, size }: { path: string; size?: number }) => (
    <span data-testid="mdi-icon" data-icon-path={path} data-icon-size={size} />
  ),
}));

import Toolbar from '../../src/webview/components/toolbar/view';
import { resolveGraphViewCreateContributions } from '../../src/webview/components/toolbar/actions/create';
import { graphStore } from '../../src/webview/store/state';
import { clearSentMessages, findMessage } from '../helpers/sentMessages';

function setDefaultState(overrides: Record<string, unknown> = {}) {
  graphStore.setState({
    depthLimit: 1,
    depthMode: false,
    activePanel: 'none',
    pluginExporters: [],
    pluginToolbarActions: [],
    graphHasIndex: false,
    graphIndexFreshness: 'missing',
    graphIndexDetail: null,
    graphIsIndexing: false,
    graphIndexProgress: null,
    nodeSizeMode: 'connections',
    ...overrides,
  });
}

describe('Toolbar', () => {
  beforeEach(() => {
    clearSentMessages();
    setDefaultState();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the grouped Graph Tool Rail without legacy collapse stacks', () => {
    const { container } = render(<Toolbar />);
    const toolbar = screen.getByTestId('toolbar');

    expect(toolbar.className).toContain('flex-col');
    expect(toolbar.className).toContain('bg-transparent');
    expect(screen.getByTestId('toolbar-lifecycle-group')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-graph-tools-group')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-system-group')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="toolbar-top-group"]')).toBeNull();
    expect(container.querySelector('[data-testid="toolbar-bottom-group"]')).toBeNull();
    expect(screen.queryByTitle('Enable Depth Mode')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Export')).not.toBeInTheDocument();
  });

  it('orders the core rail controls by lifecycle, graph tools, then system', () => {
    render(<Toolbar />);

    const orderedTitles = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('title'))
      .filter((title): title is string =>
        ['Index Workspace', 'Node Size', 'Graph Scope', 'Themes', 'Plugins', 'Settings'].includes(title ?? ''),
      );

    expect(orderedTitles).toEqual([
      'Index Workspace',
      'Node Size',
      'Graph Scope',
      'Themes',
      'Plugins',
      'Settings',
    ]);
  });

  it('sends UPDATE_NODE_SIZE_MODE for churn', async () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByTitle('Node Size'));
    fireEvent.click(await screen.findByRole('button', { name: /Churn/i }));

    expect(findMessage('UPDATE_NODE_SIZE_MODE')?.payload.nodeSizeMode).toBe('churn');
  });

  it('opens graph-local panels from the rail buttons', () => {
    render(<Toolbar />);

    fireEvent.click(screen.getByTitle('Graph Scope'));
    expect(graphStore.getState().activePanel).toBe('graphScope');

    fireEvent.click(screen.getByTitle('Themes'));
    expect(graphStore.getState().activePanel).toBe('legends');

    fireEvent.click(screen.getByTitle('Plugins'));
    expect(graphStore.getState().activePanel).toBe('plugins');

    fireEvent.click(screen.getByTitle('Settings'));
    expect(graphStore.getState().activePanel).toBe('settings');
  });

  it('refresh button sends INDEX_GRAPH before a graph index exists', () => {
    render(<Toolbar />);

    fireEvent.click(screen.getByTitle('Index Workspace'));

    expect(findMessage('INDEX_GRAPH')).toBeTruthy();
  });

  it('shows Refresh when an index already exists', () => {
    setDefaultState({ graphHasIndex: true });

    render(<Toolbar />);

    expect(screen.getByTitle('Refresh')).toBeInTheDocument();
  });

  it('hosts Graph View toolbar slot contributions under graph.toolbar', () => {
    const pluginHost = {
      attachSlotHost: vi.fn(),
      detachSlotHost: vi.fn(),
    };

    render(<Toolbar pluginHost={pluginHost as never} />);

    expect(pluginHost.attachSlotHost).toHaveBeenCalledWith(
      'graph.toolbar',
      expect.any(HTMLDivElement),
    );
  });

  it('passes the background selection context to Graph View create contributions', () => {
    const run = vi.fn();
    const graphViewContributions = {
      runtimeNodes: [],
      runtimeEdges: [],
      projections: [],
      forces: [],
      nodeDragEnd: [],
      contextMenu: [{
        pluginId: 'acme.graph-tools',
        contribution: {
          id: 'acme.new-section',
          label: 'New Section...',
          placement: { menu: 'create' },
          targets: [{ kind: 'background' }],
          isVisible: () => true,
          run,
        },
      }],
      ui: [],
    } as never;

    const liveContributions = resolveGraphViewCreateContributions({
      graphViewContributions,
    });
    expect(liveContributions.map(contribution => contribution.label)).toEqual(['New Section...']);
    liveContributions[0]?.entry.contribution.run(liveContributions[0].context);

    expect(run).toHaveBeenCalledWith({
      target: { kind: 'background' },
      selectedNodeIds: [],
      selectedEdgeIds: [],
    });
  });
});
