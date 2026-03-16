import type { ICommitInfo } from '../../../shared/types';
import { generateDateTicks } from './model';

export interface TimelineViewState {
  currentIndex: number;
  dateTicks: number[];
  indicatorPosition: number;
  isAtEnd: boolean;
}

export function getCurrentCommitIndex(
  currentCommitSha: string | null,
  timelineCommits: ICommitInfo[],
): number {
  if (!currentCommitSha || timelineCommits.length === 0) {
    return 0;
  }

  const index = timelineCommits.findIndex((commit) => commit.sha === currentCommitSha);
  return index >= 0 ? index : 0;
}

export function getTimelineViewState(
  currentCommitSha: string | null,
  playbackTime: number | null,
  timelineCommits: ICommitInfo[],
): TimelineViewState {
  return buildTimelineViewState({
    currentCommitSha,
    playbackTime,
    timelineCommits,
  });
}

export function buildTimelineViewState(options: {
  currentCommitSha: string | null;
  playbackTime: number | null;
  timelineCommits: ICommitInfo[];
}): TimelineViewState {
  const { currentCommitSha, playbackTime, timelineCommits } = options;

  if (timelineCommits.length === 0) {
    return {
      currentIndex: 0,
      dateTicks: [],
      indicatorPosition: 0,
      isAtEnd: false,
    };
  }

  const currentIndex = getCurrentCommitIndex(currentCommitSha, timelineCommits);
  const minTimestamp = timelineCommits[0].timestamp;
  const maxTimestamp = timelineCommits[timelineCommits.length - 1].timestamp;
  const timeRange = maxTimestamp - minTimestamp || 1;
  const indicatorTimestamp = playbackTime
    ?? (currentCommitSha
      ? timelineCommits.find((commit) => commit.sha === currentCommitSha)?.timestamp ?? minTimestamp
      : minTimestamp);

  return {
    currentIndex,
    dateTicks: generateDateTicks(minTimestamp, maxTimestamp),
    indicatorPosition: Math.max(
      0,
      Math.min(100, ((indicatorTimestamp - minTimestamp) / timeRange) * 100),
    ),
    isAtEnd: currentIndex === timelineCommits.length - 1,
  };
}
