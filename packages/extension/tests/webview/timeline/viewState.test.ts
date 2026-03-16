import { describe, expect, it } from 'vitest';
import {
  buildTimelineViewState,
  getCurrentCommitIndex,
  getTimelineViewState,
} from '../../../src/webview/components/timeline/viewState';

function createCommit(sha: string, timestamp: number) {
  return {
    sha,
    timestamp,
    message: `${sha} message`,
    author: `${sha} author`,
    parents: [],
  };
}

describe('timeline/viewState', () => {
  describe('getCurrentCommitIndex', () => {
    const timelineCommits = [
      createCommit('aaa', 0),
      createCommit('bbb', 40),
      createCommit('ccc', 80),
    ];

    it('returns zero when there is no current commit sha', () => {
      expect(getCurrentCommitIndex(null, timelineCommits)).toBe(0);
    });

    it('returns zero when the current commit sha is not present', () => {
      expect(getCurrentCommitIndex('missing', timelineCommits)).toBe(0);
    });

    it('returns zero when there are no timeline commits', () => {
      expect(getCurrentCommitIndex('aaa', [])).toBe(0);
    });

    it('returns the first commit index when the first sha is present', () => {
      expect(getCurrentCommitIndex('aaa', timelineCommits)).toBe(0);
    });

    it('returns the matching commit index when the sha is present', () => {
      expect(getCurrentCommitIndex('bbb', timelineCommits)).toBe(1);
    });
  });

  describe('buildTimelineViewState', () => {
    const timelineCommits = [
      createCommit('aaa', 0),
      createCommit('bbb', 40),
      createCommit('ccc', 80),
    ];

    it('returns an empty state when there are no timeline commits', () => {
      expect(
        buildTimelineViewState({
          currentCommitSha: null,
          playbackTime: null,
          timelineCommits: [],
        }),
      ).toEqual({
        currentIndex: 0,
        dateTicks: [],
        indicatorPosition: 0,
        isAtEnd: false,
      });
    });

    it('uses the current commit sha to derive the selected index and indicator position', () => {
      expect(
        buildTimelineViewState({
          currentCommitSha: 'bbb',
          playbackTime: null,
          timelineCommits,
        }),
      ).toEqual({
        currentIndex: 1,
        dateTicks: [10, 20, 30, 40, 50, 60, 70],
        indicatorPosition: 50,
        isAtEnd: false,
      });
    });

    it('marks the state as at the end when the current commit is the last commit', () => {
      expect(
        buildTimelineViewState({
          currentCommitSha: 'ccc',
          playbackTime: null,
          timelineCommits,
        }),
      ).toMatchObject({
        currentIndex: 2,
        indicatorPosition: 100,
        isAtEnd: true,
      });
    });

    it('uses playback time instead of the current commit timestamp for the indicator', () => {
      expect(
        buildTimelineViewState({
          currentCommitSha: 'aaa',
          playbackTime: 60,
          timelineCommits,
        }),
      ).toMatchObject({
        currentIndex: 0,
        indicatorPosition: 75,
      });
    });

    it('clamps the indicator position below zero', () => {
      expect(
        buildTimelineViewState({
          currentCommitSha: 'aaa',
          playbackTime: -20,
          timelineCommits,
        }),
      ).toMatchObject({
        indicatorPosition: 0,
      });
    });

    it('clamps the indicator position above one hundred', () => {
      expect(
        buildTimelineViewState({
          currentCommitSha: 'aaa',
          playbackTime: 120,
          timelineCommits,
        }),
      ).toMatchObject({
        indicatorPosition: 100,
      });
    });

    it('falls back to the first timestamp when the current sha is missing', () => {
      expect(
        buildTimelineViewState({
          currentCommitSha: 'missing',
          playbackTime: null,
          timelineCommits,
        }),
      ).toMatchObject({
        currentIndex: 0,
        indicatorPosition: 0,
        isAtEnd: false,
      });
    });

    it('derives the indicator position from the commit range instead of absolute timestamps', () => {
      const shiftedTimelineCommits = [
        createCommit('aaa', 100),
        createCommit('bbb', 140),
        createCommit('ccc', 180),
      ];

      expect(
        buildTimelineViewState({
          currentCommitSha: 'bbb',
          playbackTime: null,
          timelineCommits: shiftedTimelineCommits,
        }),
      ).toEqual({
        currentIndex: 1,
        dateTicks: [110, 120, 130, 140, 150, 160, 170],
        indicatorPosition: 50,
        isAtEnd: false,
      });
    });
  });

  describe('getTimelineViewState', () => {
    it('returns the same derived state as buildTimelineViewState', () => {
      const timelineCommits = [
        createCommit('aaa', 0),
        createCommit('bbb', 40),
        createCommit('ccc', 80),
      ];

      expect(
        getTimelineViewState('bbb', 60, timelineCommits),
      ).toEqual(
        buildTimelineViewState({
          currentCommitSha: 'bbb',
          playbackTime: 60,
          timelineCommits,
        }),
      );
    });
  });
});
