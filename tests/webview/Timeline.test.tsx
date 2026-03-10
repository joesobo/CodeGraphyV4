import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Timeline from '../../src/webview/components/Timeline';
import { graphStore } from '../../src/webview/store';
import type { ICommitInfo, IGraphData } from '../../src/shared/types';

// Capture postMessage calls
const sentMessages: unknown[] = [];
vi.mock('../../src/webview/lib/vscodeApi', () => ({
  postMessage: (msg: unknown) => sentMessages.push(msg),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

const MOCK_COMMITS: ICommitInfo[] = [
  { sha: 'aaa111aaa111aaa111aaa111aaa111aaa111aaa1', timestamp: 1000, message: 'Initial commit', author: 'Alice', parents: [] },
  { sha: 'bbb222bbb222bbb222bbb222bbb222bbb222bbb2', timestamp: 2000, message: 'Add feature X', author: 'Bob', parents: ['aaa111aaa111aaa111aaa111aaa111aaa111aaa1'] },
  { sha: 'ccc333ccc333ccc333ccc333ccc333ccc333ccc3', timestamp: 3000, message: 'Fix bug in feature X', author: 'Alice', parents: ['bbb222bbb222bbb222bbb222bbb222bbb222bbb2'] },
];

const MOCK_GRAPH_DATA: IGraphData = {
  nodes: [{ id: 'src/a.ts', label: 'a.ts', color: '#93C5FD' }],
  edges: [],
};

function resetStore(overrides: Record<string, unknown> = {}) {
  graphStore.setState({
    graphData: null,
    isLoading: false,
    timelineActive: false,
    timelineCommits: [],
    currentCommitSha: null,
    isIndexing: false,
    indexProgress: null,
    isPlaying: false,
    playbackSpeed: 1.0,
    ...overrides,
  });
}

describe('Timeline', () => {
  beforeEach(() => {
    sentMessages.length = 0;
    resetStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── State 1: Returns null ──────────────────────────────────────────────

  it('returns null when no timeline, not indexing, and no graph data', () => {
    resetStore({ graphData: null, timelineActive: false, isIndexing: false });
    const { container } = render(<Timeline />);
    expect(container.innerHTML).toBe('');
  });

  // ── State 1: Index Repo button ─────────────────────────────────────────

  it('shows "Index Repo" button when graph data exists but no timeline', () => {
    resetStore({ graphData: MOCK_GRAPH_DATA, timelineActive: false, isIndexing: false });
    render(<Timeline />);
    expect(screen.getByText('Index Repo')).toBeInTheDocument();
  });

  it('sends INDEX_REPO message when "Index Repo" button is clicked', () => {
    resetStore({ graphData: MOCK_GRAPH_DATA, timelineActive: false, isIndexing: false });
    render(<Timeline />);

    fireEvent.click(screen.getByText('Index Repo'));

    expect(sentMessages).toContainEqual({ type: 'INDEX_REPO' });
  });

  // ── State 2: Indexing in progress ──────────────────────────────────────

  it('shows progress bar when indexing with progress data', () => {
    resetStore({
      isIndexing: true,
      indexProgress: { phase: 'Scanning commits', current: 50, total: 200 },
    });
    render(<Timeline />);

    expect(screen.getByText(/Scanning commits/)).toBeInTheDocument();
    expect(screen.getByText(/50\/200/)).toBeInTheDocument();
  });

  it('shows generic indexing message when indexing without progress data', () => {
    resetStore({ isIndexing: true, indexProgress: null });
    render(<Timeline />);

    expect(screen.getByText('Indexing repository...')).toBeInTheDocument();
  });

  // ── State 3: Timeline ready ────────────────────────────────────────────

  it('shows timeline controls when timeline is active', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[2].sha,
      graphData: MOCK_GRAPH_DATA,
    });
    render(<Timeline />);

    // Should show the timeline area
    expect(screen.getByTestId('timeline')).toBeInTheDocument();
    // Should show the slider
    expect(screen.getByTestId('timeline-slider')).toBeInTheDocument();
    // Should show current commit info (short sha)
    expect(screen.getByText('ccc333c')).toBeInTheDocument();
    // Should show commit message
    expect(screen.getByText('Fix bug in feature X')).toBeInTheDocument();
  });

  it('shows speed selector buttons', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
    });
    render(<Timeline />);

    expect(screen.getByText('0.5x')).toBeInTheDocument();
    expect(screen.getByText('1x')).toBeInTheDocument();
    expect(screen.getByText('2x')).toBeInTheDocument();
    expect(screen.getByText('5x')).toBeInTheDocument();
  });

  it('sends PLAY_TIMELINE when play button is clicked', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
      isPlaying: false,
      playbackSpeed: 1,
    });
    render(<Timeline />);

    const playBtn = screen.getByTitle('Play');
    fireEvent.click(playBtn);

    expect(graphStore.getState().isPlaying).toBe(true);
    expect(sentMessages).toContainEqual({ type: 'PLAY_TIMELINE', payload: { speed: 1 } });
  });

  it('sends PAUSE_TIMELINE when pause button is clicked', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
      isPlaying: true,
      playbackSpeed: 1,
    });
    render(<Timeline />);

    const pauseBtn = screen.getByTitle('Pause');
    fireEvent.click(pauseBtn);

    expect(graphStore.getState().isPlaying).toBe(false);
    expect(sentMessages).toContainEqual({ type: 'PAUSE_TIMELINE' });
  });

  it('changes speed and re-sends PLAY_TIMELINE if playing', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
      isPlaying: true,
      playbackSpeed: 1,
    });
    render(<Timeline />);

    fireEvent.click(screen.getByText('2x'));

    expect(graphStore.getState().playbackSpeed).toBe(2);
    expect(sentMessages).toContainEqual({ type: 'PLAY_TIMELINE', payload: { speed: 2 } });
  });

  it('changes speed without sending PLAY_TIMELINE when paused', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
      isPlaying: false,
      playbackSpeed: 1,
    });
    render(<Timeline />);

    fireEvent.click(screen.getByText('5x'));

    expect(graphStore.getState().playbackSpeed).toBe(5);
    // Should NOT have sent a PLAY_TIMELINE message
    const playMessages = sentMessages.filter((m) => (m as { type: string }).type === 'PLAY_TIMELINE');
    expect(playMessages).toHaveLength(0);
  });

  it('debounces JUMP_TO_COMMIT on slider change', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
    });
    render(<Timeline />);

    const slider = screen.getByTestId('timeline-slider');
    fireEvent.change(slider, { target: { value: '2' } });

    // Before debounce fires, no JUMP_TO_COMMIT yet
    const jumpBefore = sentMessages.filter((m) => (m as { type: string }).type === 'JUMP_TO_COMMIT');
    expect(jumpBefore).toHaveLength(0);

    // After debounce period
    act(() => {
      vi.advanceTimersByTime(150);
    });

    const jumpAfter = sentMessages.filter((m) => (m as { type: string }).type === 'JUMP_TO_COMMIT');
    expect(jumpAfter).toHaveLength(1);
    expect(jumpAfter[0]).toEqual({
      type: 'JUMP_TO_COMMIT',
      payload: { sha: MOCK_COMMITS[2].sha },
    });
  });

  it('sends INDEX_REPO when refresh button is clicked', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
    });
    render(<Timeline />);

    const refreshBtn = screen.getByTitle('Re-index repository');
    fireEvent.click(refreshBtn);

    expect(sentMessages).toContainEqual({ type: 'INDEX_REPO' });
  });

  it('returns null when timeline active but no commits', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: [],
      currentCommitSha: null,
    });
    const { container } = render(<Timeline />);
    expect(container.innerHTML).toBe('');
  });
});
