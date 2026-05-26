import { fireEvent, render, screen, within } from '@testing-library/react';
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



    it('disables Start when the first timeline commit is selected', () => {
      resetStore({
        timelineActive: true,
        timelineCommits: MOCK_COMMITS,
        currentCommitSha: MOCK_COMMITS[0].sha,
        graphData: MOCK_GRAPH_DATA,
      });
      render(<Timeline />);

      expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
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
});
