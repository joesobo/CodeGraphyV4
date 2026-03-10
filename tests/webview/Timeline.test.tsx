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

  it('shows timeline with Current button when timeline is active', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[1].sha,
      graphData: MOCK_GRAPH_DATA,
    });
    render(<Timeline />);

    expect(screen.getByTestId('timeline')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    // "Now" label at end of axis
    expect(screen.getByText('Now')).toBeInTheDocument();
  });

  it('shows play button when not playing', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
      isPlaying: false,
    });
    render(<Timeline />);

    expect(screen.getByTitle('Play')).toBeInTheDocument();
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

  it('Current button jumps to last commit', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
    });
    render(<Timeline />);

    fireEvent.click(screen.getByText('Current'));

    expect(sentMessages).toContainEqual({
      type: 'JUMP_TO_COMMIT',
      payload: { sha: MOCK_COMMITS[2].sha },
    });
  });

  it('Current button is disabled when already at the last commit', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[2].sha,
    });
    render(<Timeline />);

    const btn = screen.getByText('Current');
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
    const track = screen.getByTestId('timeline').querySelector('[class*="cursor-pointer"]') as HTMLElement;
    if (track) {
      // Mock getBoundingClientRect
      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
        left: 0, right: 300, width: 300, top: 0, bottom: 28, height: 28,
        x: 0, y: 0, toJSON: () => {},
      });
      fireEvent.mouseDown(track, { clientX: 150 });
    }

    // After debounce
    act(() => {
      vi.advanceTimersByTime(100);
    });

    const jumpMessages = sentMessages.filter((m) => (m as { type: string }).type === 'JUMP_TO_COMMIT');
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

    const track = screen.getByTestId('timeline').querySelector('[class*="cursor-pointer"]') as HTMLElement;
    expect(track).toBeTruthy();
    // Should use VS Code theme variable, not hardcoded #000
    expect(track.style.backgroundColor).toContain('--vscode-editor-background');
  });

  it('current commit indicator uses focus border color', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[1].sha,
    });
    render(<Timeline />);

    // Find all commit line inner divs (the colored bars)
    const timeline = screen.getByTestId('timeline');
    const commitLines = timeline.querySelectorAll('[class*="cursor-pointer"] > div > div');

    // At least one should use focusBorder color for the current commit
    const currentLine = Array.from(commitLines).find(
      (el) => (el as HTMLElement).style.backgroundColor?.includes('--vscode-focusBorder')
    );
    expect(currentLine).toBeTruthy();
  });

  it('play button has accessible size (h-4 w-4)', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
      isPlaying: false,
    });
    render(<Timeline />);

    const playBtn = screen.getByTitle('Play');
    const svg = playBtn.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.classList.contains('h-4')).toBe(true);
    expect(svg?.classList.contains('w-4')).toBe(true);
  });

  it('timeline wrapper has border-t for visual separation', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
    });
    render(<Timeline />);

    const timeline = screen.getByTestId('timeline');
    expect(timeline.className).toContain('border-t');
  });

  // ── Playback speed preserved across play/pause ──────────────────────

  it('uses current playback speed when starting playback', () => {
    resetStore({
      timelineActive: true,
      timelineCommits: MOCK_COMMITS,
      currentCommitSha: MOCK_COMMITS[0].sha,
      isPlaying: false,
      playbackSpeed: 2.5,
    });
    render(<Timeline />);

    fireEvent.click(screen.getByTitle('Play'));

    expect(sentMessages).toContainEqual({
      type: 'PLAY_TIMELINE',
      payload: { speed: 2.5 },
    });
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
