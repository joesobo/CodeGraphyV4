import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../src/shared/graph/contracts';
import type { ICommitInfo } from '../../src/shared/timeline/contracts';
import Timeline from '../../src/webview/components/timeline/panel';
import { graphStore } from '../../src/webview/store/state';

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
      expect(track.style.backgroundColor).toContain('--cg-graph-background');
    });
});
