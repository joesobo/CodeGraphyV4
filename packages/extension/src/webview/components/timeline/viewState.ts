import type { ICommitInfo } from '../../../shared/timeline/contracts';
import { getCurrentCommitIndex as getCommitIndexAtSha } from './format/commits';
import { generateDateTicks } from './format/dates';

export interface TimelineViewState {
  currentIndex: number;
  dateTicks: number[];
  indicatorPosition: number;
  isAtEnd: boolean;
}

export { getCurrentCommitIndex } from './format/commits';

export function getTimelineViewState(
  currentCommitSha: string | null,
  playbackTime: number | null,
  timelineCommits: ICommitInfo[],
  maxDateTicks?: number,
): TimelineViewState {
  return buildTimelineViewState({
    currentCommitSha,
    maxDateTicks,
    playbackTime,
    timelineCommits,
  });
}

export function buildTimelineViewState(options: {
  currentCommitSha: string | null;
  maxDateTicks?: number;
  playbackTime: number | null;
  timelineCommits: ICommitInfo[];
}): TimelineViewState {
  const { currentCommitSha, maxDateTicks, playbackTime, timelineCommits } = options;

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
    dateTicks: generateDateTicks(minTimestamp, maxTimestamp, maxDateTicks),
    indicatorPosition: Math.max(
      0,
      Math.min(100, ((indicatorTimestamp - minTimestamp) / timeRange) * 100),
    ),
    isAtEnd: currentIndex === timelineCommits.length - 1,
  };
}
