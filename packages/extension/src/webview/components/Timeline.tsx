import React, { useCallback, useState } from 'react';
import type { ICommitInfo } from '../../shared/timeline/types';
import { useGraphStore } from '../store/state';
import { postMessage } from '../vscodeApi';
import { formatDate } from './timeline/format/dates';
import Controls from './timeline/view/Controls';
import CommitList from './timeline/view/CommitList';
import Status from './timeline/view/Status';
import Summary from './timeline/view/Summary';
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
}: ReadyTimelineProps): React.ReactElement | null {
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const [isCommitListCollapsed, setIsCommitListCollapsed] = useState(false);
  const controller = useTimelineController({
    currentCommitSha,
    isPlaying,
    playbackSpeed,
    setIsPlaying,
    timelineCommits,
  });
  const currentCommit = timelineCommits[controller.currentIndex] ?? timelineCommits[0];

  if (!currentCommit) {
    return null;
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border"
      data-testid="timeline-panel"
    >
      <section className="flex-shrink-0 px-3 py-2" data-testid="timeline-track-shell">
        <Track
          dateTicks={controller.dateTicks}
          indicatorPosition={controller.indicatorPosition}
          onTrackMouseDown={controller.handleTrackMouseDown}
          setTrackElement={controller.setTrackElement}
          timelineCommits={timelineCommits}
        />
        <Controls
          currentDateLabel={formatDate(currentCommit.timestamp)}
          isAtEnd={controller.isAtEnd}
          isAtStart={controller.currentIndex === 0}
          isPlaying={isPlaying}
          onJumpToEnd={controller.handleJumpToEnd}
          onJumpToNext={controller.handleJumpToNext}
          onJumpToPrevious={controller.handleJumpToPrevious}
          onJumpToStart={controller.handleJumpToStart}
          onPlayPause={controller.handlePlayPause}
        />
      </section>
      <Summary
        collapsed={isSummaryCollapsed}
        currentCommit={currentCommit}
        currentIndex={controller.currentIndex}
        onToggle={() => setIsSummaryCollapsed((value) => !value)}
        totalCommits={timelineCommits.length}
      />
      <CommitList
        collapsed={isCommitListCollapsed}
        currentCommitSha={currentCommit.sha}
        onSelectCommit={controller.handleJumpToCommit}
        onToggle={() => setIsCommitListCollapsed((value) => !value)}
        timelineCommits={timelineCommits}
      />
    </div>
  );
}

export default function Timeline(): React.ReactElement | null {
  const timelineActive = useGraphStore((state) => state.timelineActive);
  const timelineCommits = useGraphStore((state) => state.timelineCommits);
  const currentCommitSha = useGraphStore((state) => state.currentCommitSha);
  const isLoading = useGraphStore((state) => state.isLoading);
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
        isGraphLoading={isLoading}
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
