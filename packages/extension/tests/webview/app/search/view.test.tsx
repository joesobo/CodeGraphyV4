import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../../src/shared/fileColors';
import SearchApp from '../../../../src/webview/app/search/view';
import { graphStore } from '../../../../src/webview/store/state';

const harness = vi.hoisted(() => ({
  searchBarProps: null as null | Record<string, unknown>,
  sentMessages: [] as Array<{ type: string; payload?: unknown }>,
}));

const messageListeners: Array<(event: MessageEvent) => void> = [];

vi.mock('../../../../src/webview/components/searchBar/Field', () => ({
  SearchBar: (props: Record<string, unknown>) => {
    harness.searchBarProps = props;
    return (
      <div
        data-testid="mock-search-bar"
        data-count-label={String(props.countLabel ?? '')}
        data-result-count={String(props.resultCount ?? '')}
        data-total-count={String(props.totalCount ?? '')}
        data-regex-error={String(props.regexError ?? '')}
      />
    );
  },
}));

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: (message: { type: string; payload?: unknown }) => harness.sentMessages.push(message),
  getVsCodeApi: () => ({
    postMessage: (message: { type: string; payload?: unknown }) => harness.sentMessages.push(message),
    getState: () => undefined,
    setState: vi.fn(),
  }),
}));

vi.stubGlobal('addEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') {
    messageListeners.push(listener);
  }
});

vi.stubGlobal('removeEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') {
    const index = messageListeners.indexOf(listener);
    if (index !== -1) {
      messageListeners.splice(index, 1);
    }
  }
});

function resetStore(): void {
  graphStore.setState({
    graphData: null,
    isLoading: true,
    searchQuery: '',
    searchOptions: { matchCase: false, wholeWord: false, regex: false },
    favorites: new Set<string>(),
    bidirectionalMode: 'separate',
    showOrphans: true,
    directionMode: 'arrows',
    directionColor: DEFAULT_DIRECTION_COLOR,
    particleSpeed: 0.005,
    particleSize: 4,
    showLabels: true,
    graphMode: '2d',
    nodeSizeMode: 'connections',
    physicsSettings: { repelForce: 10, linkDistance: 80, linkForce: 0.15, damping: 0.7, centerForce: 0.1 },
    graphHasIndex: false,
    graphIsIndexing: false,
    graphIndexProgress: null,
    depthMode: false,
    depthLimit: 1,
    maxDepthLimit: 10,
    legends: [],
    filterPatterns: [],
    pluginFilterPatterns: [],
    pluginFilterGroups: [],
    disabledCustomFilterPatterns: [],
    disabledPluginFilterPatterns: [],
    graphNodeTypes: [],
    graphEdgeTypes: [],
    nodeColors: {},
    nodeVisibility: {},
    edgeVisibility: {},
    activePanel: 'none',
    maxFiles: 500,
  });
}

describe('SearchApp', () => {
  beforeEach(() => {
    messageListeners.length = 0;
    delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean })
      .__codegraphyWebviewReadyPosted;
    harness.searchBarProps = null;
    harness.sentMessages.length = 0;
    resetStore();
  });

  it('renders search and filter controls without waiting for graph bootstrap', () => {
    const { container } = render(<SearchApp />);

    expect(screen.getByTestId('mock-search-bar')).toBeInTheDocument();
    expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass('min-h-0');
    expect(harness.searchBarProps?.filterPopover).toMatchObject({
      customPatterns: [],
      open: false,
      pendingPatterns: [],
    });
  });

  it('updates host-owned search state when the query or options change', async () => {
    graphStore.setState({
      graphData: {
        nodes: [
          { id: 'src/App.ts', label: 'App', color: '#123456' },
          { id: 'src/Todo.ts', label: 'Todo', color: '#654321' },
        ],
        edges: [],
      },
      isLoading: false,
    });

    render(<SearchApp />);
    harness.sentMessages.length = 0;

    await act(async () => {
      (harness.searchBarProps?.onChange as (value: string) => void)('Todo');
    });

    expect(graphStore.getState().searchQuery).toBe('Todo');
    expect(harness.sentMessages).toContainEqual({
      type: 'UPDATE_SEARCH_STATE',
      payload: {
        query: 'Todo',
        options: { matchCase: false, wholeWord: false, regex: false },
      },
    });

    await act(async () => {
      (harness.searchBarProps?.onOptionsChange as (options: {
        matchCase: boolean;
        wholeWord: boolean;
        regex: boolean;
      }) => void)({ matchCase: true, wholeWord: false, regex: true });
    });

    expect(graphStore.getState().searchOptions).toEqual({
      matchCase: true,
      wholeWord: false,
      regex: true,
    });
    expect(harness.sentMessages).toContainEqual({
      type: 'UPDATE_SEARCH_STATE',
      payload: {
        query: 'Todo',
        options: { matchCase: true, wholeWord: false, regex: true },
      },
    });
  });

  it('passes search result counts and regex errors to the search controls', () => {
    graphStore.setState({
      graphData: {
        nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
        edges: [],
      },
      isLoading: false,
      searchQuery: '[',
      searchOptions: { matchCase: false, wholeWord: false, regex: true },
    });

    render(<SearchApp />);

    expect(screen.getByTestId('mock-search-bar')).toHaveAttribute('data-result-count', '0');
    expect(screen.getByTestId('mock-search-bar').getAttribute('data-regex-error')).toMatch(
      /unterminated|invalid|character/i,
    );
  });

  it('counts filters against the scoped visible graph instead of raw graph data', () => {
    graphStore.setState({
      graphData: {
        nodes: [
          { id: 'src/lib/a.ts', label: 'a.ts', color: '#3B82F6', nodeType: 'file' },
          { id: 'README.md', label: 'README.md', color: '#3B82F6', nodeType: 'file' },
        ],
        edges: [],
      },
      graphEdgeTypes: [
        { id: 'nests', label: 'Nests', defaultColor: '#222222', defaultVisible: true },
      ],
      filterPatterns: ['src/lib'],
      isLoading: false,
      nodeVisibility: {
        file: false,
        folder: true,
      },
      edgeVisibility: {
        nests: true,
      },
      showOrphans: true,
    });

    render(<SearchApp />);

    expect(screen.getByTestId('mock-search-bar')).toHaveAttribute('data-count-label', '2 of 3');
  });

  it('updates the excluded count immediately when plugin filters are disabled', async () => {
    graphStore.setState({
      graphData: {
        nodes: [
          { id: 'src/generated/a.ts', label: 'a.ts', color: '#3B82F6', nodeType: 'file' },
          { id: 'src/app.ts', label: 'app.ts', color: '#3B82F6', nodeType: 'file' },
        ],
        edges: [],
      },
      isLoading: false,
      pluginFilterGroups: [
        { pluginId: 'plugin.one', pluginName: 'Plugin One', patterns: ['**/generated/**'] },
      ],
      pluginFilterPatterns: ['**/generated/**'],
      disabledPluginFilterPatterns: [],
      showOrphans: true,
    });

    render(<SearchApp />);

    expect((harness.searchBarProps?.filterPopover as { excludedCount: number }).excludedCount).toBe(1);

    await act(async () => {
      (harness.searchBarProps?.filterPopover as {
        onDisabledPluginPatternsChange: (patterns: string[]) => void;
      }).onDisabledPluginPatternsChange(['**/generated/**']);
    });

    expect((harness.searchBarProps?.filterPopover as { excludedCount: number }).excludedCount).toBe(0);
  });
});
