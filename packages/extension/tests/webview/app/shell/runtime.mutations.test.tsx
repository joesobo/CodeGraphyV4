import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../../src/shared/fileColors';
import { graphStore } from '../../../../src/webview/store/state';

const harness = vi.hoisted(() => ({
  emptyStateProps: null as null | Record<string, unknown>,
  searchBarProps: null as null | Record<string, unknown>,
  setupMessageListener: vi.fn(),
  pluginHost: {
    attachSlotHost: vi.fn(),
    detachSlotHost: vi.fn(),
  },
  injectPluginAssets: vi.fn(),
}));

vi.mock('../../../../src/webview/components/graph/view/component', () => ({
  default: () => <div data-testid="mock-graph" />,
}));

vi.mock('../../../../src/webview/components/searchBar/Field', () => ({
  SearchBar: (props: Record<string, unknown>) => {
    harness.searchBarProps = props;
    return <div data-testid="mock-search-bar" data-result-count={String(props.resultCount ?? '')} />;
  },
}));

vi.mock('../../../../src/webview/components/settingsPanel/Drawer', () => ({
  default: () => null,
}));

vi.mock('../../../../src/webview/components/plugins/Panel', () => ({
  default: () => null,
}));

vi.mock('../../../../src/webview/components/toolbar/view', () => ({
  default: () => <div data-testid="toolbar" />,
}));

vi.mock('../../../../src/webview/components/depthViewControls', () => ({
  DepthViewControls: () => <div data-testid="depth-view-controls" />,
}));

vi.mock('../../../../src/webview/components/activeFileBreadcrumb/view', () => ({
  ActiveFileBreadcrumb: () => <div data-testid="active-file-breadcrumb" />,
}));

vi.mock('../../../../src/webview/theme/useTheme', () => ({
  useTheme: () => 'dark',
}));

vi.mock('../../../../src/webview/pluginRuntime/useManager', () => ({
  usePluginManager: () => ({
    pluginHost: harness.pluginHost,
    injectPluginAssets: harness.injectPluginAssets,
  }),
}));

vi.mock('../../../../src/webview/search/useFilteredGraph', () => ({
  useFilteredGraph: () => ({
    filteredData: undefined,
    coloredData: undefined,
    regexError: undefined,
  }),
}));

vi.mock('../../../../src/webview/app/shell/states', () => ({
  LoadingState: () => <div data-testid="loading-state" />,
  EmptyState: (props: Record<string, unknown>) => {
    harness.emptyStateProps = props;
    return <div data-testid="empty-state" data-full-screen={String(props.fullScreen ?? '')} />;
  },
}));

vi.mock('../../../../src/webview/app/shell/messageListener', () => ({
  setupMessageListener: (...args: unknown[]) => harness.setupMessageListener(...args),
}));

import App from '../../../../src/webview/app/view';

function resetStore(): void {
  graphStore.setState({
    graphData: null,
    isLoading: false,
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
    pluginStatuses: [],
    graphNodeTypes: [],
    graphEdgeTypes: [],
    nodeColors: {},
    nodeVisibility: {},
    edgeVisibility: {},
    activePanel: 'none',
    timelineActive: false,
    nodeDecorations: {},
    edgeDecorations: {},
    maxFiles: 500,
  });
}

describe('App runtime mutations', () => {
  beforeEach(() => {
    resetStore();
    harness.emptyStateProps = null;
    harness.searchBarProps = null;
    harness.setupMessageListener.mockReset();
    harness.setupMessageListener.mockReturnValue(vi.fn());
    harness.pluginHost = {
      attachSlotHost: vi.fn(),
      detachSlotHost: vi.fn(),
    };
    harness.injectPluginAssets.mockReset();
  });

  it('keeps EmptyState non-full-screen and tolerates undefined filtered data', () => {
    graphStore.setState({
      graphData: { nodes: [], edges: [] },
      isLoading: false,
    });

    render(<App />);

    expect(screen.getByTestId('empty-state')).toHaveAttribute('data-full-screen', 'false');
    expect(harness.emptyStateProps).toMatchObject({ fullScreen: false });
    expect(screen.getByTestId('mock-search-bar')).toHaveAttribute('data-result-count', '');
  });

  it('re-subscribes the message listener when plugin host inputs change', () => {
    const cleanup = vi.fn();
    harness.setupMessageListener.mockReturnValue(cleanup);

    graphStore.setState({
      graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
    });

    const { rerender } = render(<App />);
    expect(harness.setupMessageListener).toHaveBeenCalledTimes(1);

    harness.pluginHost = {
      attachSlotHost: vi.fn(),
      detachSlotHost: vi.fn(),
    };
    harness.injectPluginAssets.mockImplementationOnce(() => undefined);
    rerender(<App />);

    expect(harness.setupMessageListener).toHaveBeenCalledTimes(2);
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
