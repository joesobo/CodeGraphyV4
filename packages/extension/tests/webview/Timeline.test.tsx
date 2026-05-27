import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../src/shared/graph/contracts';
import type { ICommitInfo } from '../../src/shared/timeline/contracts';
import { formatDate } from '../../src/webview/components/timeline/format/dates';
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

    it('shows a disabled "Index Git History" button when no graph data is available yet', () => {
      resetStore({ graphData: null, timelineActive: false, isIndexing: false });
      render(<Timeline />);
      expect(screen.getByText('Index Git History')).toBeDisabled();
    });



    it('shows a disabled "Index Git History" button while the graph is still loading', () => {
      resetStore({
        graphData: MOCK_GRAPH_DATA,
        isLoading: true,
        timelineActive: false,
        isIndexing: false,
      });
      render(<Timeline />);

      expect(screen.getByText('Index Git History')).toBeDisabled();
    });



    // ── State 1: Index Git History button ──────────────────────────────────

    it('shows "Index Git History" button when graph data exists but no timeline', () => {
      resetStore({ graphData: MOCK_GRAPH_DATA, timelineActive: false, isIndexing: false });
      render(<Timeline />);
      expect(screen.getByText('Index Git History')).toBeInTheDocument();
    });



    it('sends INDEX_REPO message when "Index Git History" button is clicked', () => {
      resetStore({ graphData: MOCK_GRAPH_DATA, timelineActive: false, isIndexing: false });
      render(<Timeline />);

      fireEvent.click(screen.getByText('Index Git History'));

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
});
