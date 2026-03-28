import type { ICommitInfo } from '../../../shared/contracts';
import { getCurrentCommitIndex as getCommitIndexAtSha } from './commits';
import { generateDateTicks } from './dates';

export interface TimelineViewState {
  currentIndex: number;
  dateTicks: number[];
  indicatorPosition: number;
  isAtEnd: boolean;
}

export { getCurrentCommitIndex } from './commits';

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

  const currentIndex = getCommitIndexAtSha(currentCommitSha, timelineCommits);
  const minTimestamp = timelineCommits[0].timestamp;
  const maxTimestamp = timelineCommits[timelineCommits.length - 1].timestamp;
  const timeRange = maxTimestamp - minTimestamp || 1;
  const indicatorTimestamp = playbackTime ?? timelineCommits[currentIndex]?.timestamp ?? minTimestamp;

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
