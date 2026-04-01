import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../src/shared/fileColors';
import { graphStore } from '../../../src/webview/store/state';

vi.mock('../../../src/webview/components/Timeline', () => ({
  default: () => <div data-testid="timeline-content" />,
}));

vi.mock('../../../src/webview/pluginRuntime/useManager', () => ({
  usePluginManager: () => ({
    pluginHost: {},
    injectPluginAssets: vi.fn(),
  }),
}));

vi.mock('../../../src/webview/app/messageListener', () => ({
  setupMessageListener: vi.fn(() => () => {}),
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the timeline in a content-height shell instead of a full-screen wrapper', () => {
    graphStore.setState({
      graphData: { nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }], edges: [] },
      timelineActive: true,
    });

    const { container } = render(<TimelineApp />);

    expect(screen.getByTestId('timeline-content')).toBeInTheDocument();
    const shell = container.firstElementChild as HTMLElement | null;
    expect(shell).toBeTruthy();
    expect(shell?.className).toContain('w-full');
    expect(shell?.className).not.toContain('h-screen');
    expect(shell?.className).not.toContain('overflow-auto');
  });
});
