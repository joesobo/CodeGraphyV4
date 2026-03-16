import { describe, expect, it, vi } from 'vitest';
import {
  findCommitIndexAtTime,
  getCurrentCommitIndex,
} from '../../../src/webview/components/timeline/commits';

describe('timeline/commits', () => {
  describe('findCommitIndexAtTime', () => {
    const commits = [
      { timestamp: 10 },
      { timestamp: 20 },
      { timestamp: 20 },
      { timestamp: 35 },
    ];

    it('returns -1 when the commit list is empty', () => {
      expect(findCommitIndexAtTime([], 10)).toBe(-1);
    });

    it('returns -1 when the requested time is before the first commit', () => {
      expect(findCommitIndexAtTime(commits, 9)).toBe(-1);
    });

    it('returns the last matching index when multiple commits share a timestamp', () => {
      expect(findCommitIndexAtTime(commits, 20)).toBe(2);
    });

    it('returns the last commit before an in-between time', () => {
      expect(findCommitIndexAtTime(commits, 34)).toBe(2);
    });

    it('returns the final commit index when the requested time is after the range', () => {
      expect(findCommitIndexAtTime(commits, 100)).toBe(3);
    });
  });

  describe('getCurrentCommitIndex', () => {
    const timelineCommits = [
      { sha: 'aaa' },
      { sha: 'bbb' },
      { sha: 'ccc' },
    ];

    it('returns zero when there is no current commit sha', () => {
      expect(getCurrentCommitIndex(null, timelineCommits)).toBe(0);
    });

    it('returns early without searching commits when the current sha is missing', () => {
      const guardedTimelineCommits = [{ sha: 'aaa' }];
      const findIndex = vi.fn(() => 0);
      Object.defineProperty(guardedTimelineCommits, 'findIndex', {
        value: findIndex,
      });

      expect(getCurrentCommitIndex(null, guardedTimelineCommits)).toBe(0);
      expect(findIndex).not.toHaveBeenCalled();
    });

    it('returns zero when there are no timeline commits', () => {
      expect(getCurrentCommitIndex('bbb', [])).toBe(0);
    });

    it('returns zero when the current commit sha is not present', () => {
      expect(getCurrentCommitIndex('missing', timelineCommits)).toBe(0);
    });

    it('returns the matching commit index when the sha is present', () => {
      expect(getCurrentCommitIndex('bbb', timelineCommits)).toBe(1);
    });

    it('returns the first commit index when the first sha matches', () => {
      expect(getCurrentCommitIndex('aaa', timelineCommits)).toBe(0);
    });
  });
});
