import React, { useCallback } from 'react';
import type { ICommitInfo } from '../../shared/timeline/types';
import { useGraphStore } from '../store/state';
import { postMessage } from '../vscodeApi';
import Status from './timeline/view/Status';
import Track from './timeline/view/Track';
import { useTimelineController } from './timeline/use/controller';

interface ReadyTimelineProps {
  currentCommitSha: string | null;
  isPlaying: boolean;
  playbackSpeed: number;
  setIsPlaying: (value: boolean) => void;
  timelineCommits: ICommitInfo[];
}

function ReadyTimeline({
  currentCommitSha,
  isPlaying,
  playbackSpeed,
  setIsPlaying,
  timelineCommits,
}: ReadyTimelineProps): React.ReactElement {
  const controller = useTimelineController({
    currentCommitSha,
    isPlaying,
    playbackSpeed,
    setIsPlaying,
    timelineCommits,
  });

  return (
    <Track
      dateTicks={controller.dateTicks}
      indicatorPosition={controller.indicatorPosition}
      isAtEnd={controller.isAtEnd}
      isPlaying={isPlaying}
      onJumpToEnd={controller.handleJumpToEnd}
      onPlayPause={controller.handlePlayPause}
      onTrackMouseDown={controller.handleTrackMouseDown}
      setTrackElement={controller.setTrackElement}
      timelineCommits={timelineCommits}
    />
  );
}

export default function Timeline(): React.ReactElement | null {
  const timelineActive = useGraphStore((state) => state.timelineActive);
  const timelineCommits = useGraphStore((state) => state.timelineCommits);
  const currentCommitSha = useGraphStore((state) => state.currentCommitSha);
  const isIndexing = useGraphStore((state) => state.isIndexing);
  const indexProgress = useGraphStore((state) => state.indexProgress);
  const isPlaying = useGraphStore((state) => state.isPlaying);
  const playbackSpeed = useGraphStore((state) => state.playbackSpeed);
  const graphData = useGraphStore((state) => state.graphData);
  const setIsPlaying = useGraphStore((state) => state.setIsPlaying);

  const handleIndexRepo = useCallback(() => {
    postMessage({ type: 'INDEX_REPO' });
  }, []);

  if (!timelineActive || isIndexing) {
    return (
      <Status
        hasGraphData={Boolean(graphData)}
        isIndexing={isIndexing}
        indexProgress={indexProgress}
        onIndexRepo={handleIndexRepo}
      />
    );
  }

  if (timelineCommits.length === 0) {
    return null;
  }

  return (
    <ReadyTimeline
      currentCommitSha={currentCommitSha}
      isPlaying={isPlaying}
      playbackSpeed={playbackSpeed}
      setIsPlaying={setIsPlaying}
      timelineCommits={timelineCommits}
    />
  );
}
