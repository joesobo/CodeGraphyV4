import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../src/shared/fileColors';
import { graphStore } from '../../../src/webview/store/state';

const harness = vi.hoisted(() => ({
  injectPluginAssets: vi.fn(),
  pluginHost: {},
  setupMessageListener: vi.fn(() => vi.fn()),
}));

vi.mock('../../../src/webview/components/Timeline', () => ({
  default: () => <div data-testid="timeline-content" />,
}));

vi.mock('../../../src/webview/pluginRuntime/useManager', () => ({
  usePluginManager: () => ({
    pluginHost: harness.pluginHost,
    injectPluginAssets: harness.injectPluginAssets,
  }),
}));

vi.mock('../../../src/webview/app/messageListener', () => ({
  setupMessageListener: harness.setupMessageListener,
}));

import TimelineApp from '../../../src/webview/app/TimelineApp';

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
    depthLimit: 1,
    groups: [],
    filterPatterns: [],
    pluginFilterPatterns: [],
    availableViews: [],
    activeViewId: 'codegraphy.connections',
    pluginStatuses: [],
    activePanel: 'none',
    timelineActive: false,
    timelineCommits: [],
    currentCommitSha: null,
    isPlaying: false,
    playbackSpeed: 1,
    isIndexing: false,
    indexProgress: null,
    nodeDecorations: {},
    edgeDecorations: {},
    maxFiles: 500,
  });
}

describe('TimelineApp', () => {
  beforeEach(() => {
    resetStore();
    harness.injectPluginAssets.mockReset();
    harness.setupMessageListener.mockReset();
    harness.setupMessageListener.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the timeline in a full-height shell so internal sections can scroll', () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }], edges: [] },
      timelineActive: true,
    });

    const { container } = render(<TimelineApp />);

    expect(screen.getByTestId('timeline-content')).toBeInTheDocument();
    const shell = container.firstElementChild as HTMLElement | null;
    expect(shell).toBeTruthy();
    expect(shell?.className).toContain('flex');
    expect(shell?.className).toContain('w-full');
    expect(shell?.className).toContain('h-full');
    expect(shell?.className).toContain('min-h-0');
    expect(shell?.className).toContain('overflow-hidden');
    expect(shell?.className).not.toContain('h-screen');
  });

  it('does not show the graph loading screen while the graph is still loading', () => {
    graphStore.setState({
      graphData: null,
      isLoading: true,
      timelineActive: false,
    });

    render(<TimelineApp />);

    expect(screen.getByTestId('timeline-content')).toBeInTheDocument();
    expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
  });

  it('registers the message listener with the current plugin manager hooks and cleans it up on unmount', () => {
    const cleanup = vi.fn();
    harness.setupMessageListener.mockReturnValue(cleanup);

    const { unmount } = render(<TimelineApp />);

    expect(harness.setupMessageListener).toHaveBeenCalledWith(
      harness.injectPluginAssets,
      harness.pluginHost,
    );

    unmount();

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('re-registers the message listener when the plugin manager dependencies change', () => {
    const firstCleanup = vi.fn();
    const secondCleanup = vi.fn();
    harness.setupMessageListener
      .mockReturnValueOnce(firstCleanup)
      .mockReturnValueOnce(secondCleanup);

    const { rerender, unmount } = render(<TimelineApp />);
    const nextPluginHost = {};
    const nextInjectPluginAssets = vi.fn();

    harness.pluginHost = nextPluginHost;
    harness.injectPluginAssets = nextInjectPluginAssets;

    rerender(<TimelineApp />);

    expect(firstCleanup).toHaveBeenCalledOnce();
    expect(harness.setupMessageListener).toHaveBeenNthCalledWith(1, expect.any(Function), expect.any(Object));
    expect(harness.setupMessageListener).toHaveBeenNthCalledWith(2, nextInjectPluginAssets, nextPluginHost);

    unmount();

    expect(secondCleanup).toHaveBeenCalledOnce();
  });
});
