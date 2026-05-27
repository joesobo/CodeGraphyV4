import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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



    it('has a separate smooth playback indicator using focus border color', () => {
      resetStore({
        timelineActive: true,
        timelineCommits: MOCK_COMMITS,
        currentCommitSha: MOCK_COMMITS[1].sha,
      });
      render(<Timeline />);

      const indicator = screen.getByTestId('timeline-indicator');
      const bar = indicator.firstElementChild as HTMLElement;
      expect(bar?.style.backgroundColor).toContain('--cg-focus-border');
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
