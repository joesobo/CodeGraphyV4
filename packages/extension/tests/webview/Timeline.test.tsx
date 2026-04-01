import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import Timeline from '../../src/webview/components/Timeline';
import { graphStore } from '../../src/webview/store/state';
import type { IGraphData } from '../../src/shared/graph/types';
import type { ICommitInfo } from '../../src/shared/timeline/types';
import { formatDate } from '../../src/webview/components/timeline/format/dates';

// Capture postMessage calls
const sentMessages: unknown[] = [];
vi.mock('../../src/webview/vscodeApi', () => ({
  postMessage: (msg: unknown) => sentMessages.push(msg),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

const MOCK_COMMITS: ICommitInfo[] = [
  { sha: 'aaa111aaa111aaa111aaa111aaa111aaa111aaa1', timestamp: 1000, message: 'Initial commit', author: 'Alice', parents: [] },
  { sha: 'bbb222bbb222bbb222bbb222bbb222bbb222bbb2', timestamp: 2000, message: 'Add feature X', author: 'Bob', parents: ['aaa111aaa111aaa111aaa111aaa111aaa111aaa1'] },
  { sha: 'ccc333ccc333ccc333ccc333ccc333ccc333ccc3', timestamp: 3000, message: 'Fix bug in feature X', author: 'Alice', parents: ['bbb222bbb222bbb222bbb222bbb222bbb222bbb2'] },
];

const MOCK_COMMITS_WITH_EMPTY_START: ICommitInfo[] = [
  { sha: 'zero000zero000zero000zero000zero000zero0', timestamp: 500, message: 'Init repo', author: 'Alice', parents: [] },
  ...MOCK_COMMITS,
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

  it('shows a disabled "Index Repo" button when no graph data is available yet', () => {
    resetStore({ graphData: null, timelineActive: false, isIndexing: false });
    render(<Timeline />);
    expect(screen.getByText('Index Repo')).toBeDisabled();
  });

  it('shows a disabled "Index Repo" button while the graph is still loading', () => {
    resetStore({
      graphData: null,
      isLoading: true,
      timelineActive: false,
      isIndexing: false,
    });
    render(<Timeline />);

    expect(screen.getByText('Index Repo')).toBeDisabled();
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

  it('shows the timeline panel summary, controls, and commit list when timeline is active', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[1].sha,
      graphData: MOCK_GRAPH_DATA,
    });
    render(<Timeline />);

    expect(screen.getByTestId('timeline-panel')).toBeInTheDocument();
    expect(
      screen.getByTestId('timeline-track-shell').compareDocumentPosition(screen.getByTestId('timeline-summary'))
        & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByTestId('timeline-summary')).toBeInTheDocument();
    expect(within(screen.getByTestId('timeline-summary')).getByText('Current Commit')).toBeInTheDocument();
    expect(within(screen.getByTestId('timeline-summary')).getByText('Add feature X')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-controls')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-track-shell')).toHaveClass('px-3');
    expect(within(screen.getByTestId('timeline-controls')).getByText(formatDate(MOCK_COMMITS[1].timestamp))).toBeInTheDocument();
    expect(screen.queryByText('Viewing Date')).not.toBeInTheDocument();
    expect(screen.getByTestId('timeline-commit-list')).toBeInTheDocument();
    expect(within(screen.getByTestId('timeline-commit-list')).getByText('Commits')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-commit-list-scroll')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fix bug in feature X/i })).toBeInTheDocument();
    // "Now" label at end of axis
    expect(screen.getByText('Now')).toBeInTheDocument();
  });

  it('allows collapsing the current commit and commit list sections', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[1].sha,
      graphData: MOCK_GRAPH_DATA,
    });
    render(<Timeline />);

    fireEvent.click(screen.getByRole('button', { name: 'Current Commit' }));
    expect(
      within(screen.getByTestId('timeline-summary')).queryByText('Add feature X'),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Commits' }));
    expect(screen.queryByTestId('timeline-commit-list-scroll')).not.toBeInTheDocument();
  });

  it('resets to the first graphable commit when Start is clicked', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS_WITH_EMPTY_START,
      currentCommitSha: MOCK_COMMITS[1].sha,
    });
    render(<Timeline />);

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(sentMessages).toContainEqual({
      type: 'RESET_TIMELINE',
    });
  });

  it('jumps to a selected commit when a commit list entry is clicked', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[1].sha,
    });
    render(<Timeline />);

    fireEvent.click(screen.getByRole('button', { name: /Initial commit/i }));

    expect(sentMessages).toContainEqual({
      type: 'JUMP_TO_COMMIT',
      payload: { sha: MOCK_COMMITS[0].sha },
    });
  });

  it('shows play button when not playing', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
      isPlaying: false,
    });
    render(<Timeline />);

    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('sets isPlaying to true when play button is clicked', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
      isPlaying: false,
      playbackSpeed: 1,
    });
    render(<Timeline />);

    const playBtn = screen.getByRole('button', { name: 'Play' });
    fireEvent.click(playBtn);

    expect(graphStore.getState().isPlaying).toBe(true);
  });

  it('sets isPlaying to false when pause button is clicked', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
      isPlaying: true,
      playbackSpeed: 1,
    });
    render(<Timeline />);

    const pauseBtn = screen.getByRole('button', { name: 'Pause' });
    fireEvent.click(pauseBtn);

    expect(graphStore.getState().isPlaying).toBe(false);
  });

  it('resumes playback from the first graphable commit when play is pressed at the end', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS_WITH_EMPTY_START,
      currentCommitSha: MOCK_COMMITS[2].sha, // last commit
      isPlaying: false,
    });
    render(<Timeline />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(sentMessages).toContainEqual({
      type: 'RESET_TIMELINE',
    });

    act(() => {
      graphStore.getState().handleExtensionMessage({
        type: 'COMMIT_GRAPH_DATA',
        payload: {
          sha: MOCK_COMMITS[0].sha,
          graphData: MOCK_GRAPH_DATA,
        },
      });
    });

    expect(graphStore.getState().isPlaying).toBe(true);
  });

  it('End button stops playback', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
      isPlaying: true,
    });
    render(<Timeline />);

    fireEvent.click(screen.getByRole('button', { name: 'End' }));

    expect(graphStore.getState().isPlaying).toBe(false);
    expect(sentMessages).toContainEqual({
      type: 'JUMP_TO_COMMIT',
      payload: { sha: MOCK_COMMITS[2].sha },
    });
  });

  it('End button jumps to last commit', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
    });
    render(<Timeline />);

    fireEvent.click(screen.getByRole('button', { name: 'End' }));

    expect(sentMessages).toContainEqual({
      type: 'JUMP_TO_COMMIT',
      payload: { sha: MOCK_COMMITS[2].sha },
    });
  });

  it('End button is disabled when already at the last commit', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[2].sha,
    });
    render(<Timeline />);

    const btn = screen.getByRole('button', { name: 'End' });
    expect(btn).toBeDisabled();
  });

  it('sends JUMP_TO_COMMIT on track click (debounced)', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
    });
    render(<Timeline />);

    // Simulate clicking in the middle of the track
    const track = screen.getByTestId('timeline-track');
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      left: 0, right: 300, width: 300, top: 0, bottom: 28, height: 28,
      x: 0, y: 0, toJSON: () => {},
    });
    fireEvent.mouseDown(track, { clientX: 150 });

    // After debounce
    act(() => {
      vi.advanceTimersByTime(100);
    });

    const jumpMessages = sentMessages.filter(
      (message) => (message as { type: string }).type === 'JUMP_TO_COMMIT',
    );
    expect(jumpMessages.length).toBeGreaterThanOrEqual(1);
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

  // ── UI styling tests ────────────────────────────────────────────────

  it('timeline track uses theme-aware background', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
    });
    render(<Timeline />);

    const track = screen.getByTestId('timeline-track');
    // Should use VS Code theme variable, not hardcoded #000
    expect(track.style.backgroundColor).toContain('--vscode-editor-background');
  });

  it('has a separate smooth playback indicator using focus border color', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[1].sha,
    });
    render(<Timeline />);

    const indicator = screen.getByTestId('timeline-indicator');
    const bar = indicator.firstElementChild as HTMLElement;
    expect(bar?.style.backgroundColor).toContain('--vscode-focusBorder');
  });

  it('play control is rendered as an enabled button', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
      isPlaying: false,
    });
    render(<Timeline />);

    expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled();
  });

  it('timeline wrapper has border-t for visual separation', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
    });
    render(<Timeline />);

    const timeline = screen.getByTestId('timeline-panel');
    expect(timeline.className).toContain('border-t');
  });

  // ── Playback speed preserved across play/pause ──────────────────────

  it('starts playback with isPlaying set correctly', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
      isPlaying: false,
      playbackSpeed: 2.5,
    });
    render(<Timeline />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    // Playback is now webview-driven via requestAnimationFrame
    expect(graphStore.getState().isPlaying).toBe(true);
  });

  // ── PLAYBACK_ENDED store handler ────────────────────────────────────

  it('PLAYBACK_ENDED message sets isPlaying to false', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
      isPlaying: true,
    });

    graphStore.getState().handleExtensionMessage({ type: 'PLAYBACK_ENDED' });

    expect(graphStore.getState().isPlaying).toBe(false);
  });
});
