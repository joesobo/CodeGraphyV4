import type { ICommitInfo } from '../../../../shared/timeline/types';

const BRANCH_COLORS = [
  '#58a6ff',
  '#3fb950',
  '#d2a8ff',
  '#ff7b72',
  '#f2cc60',
  '#79c0ff',
  '#ffa657',
  '#a5d6ff',
];

interface ActiveLane {
  color: string;
  sha: string;
}

export interface BranchLaneSegment {
  color: string;
  lane: number;
}

export interface BranchLaneConnection {
  color: string;
  fromLane: number;
  toLane: number;
}

export interface BranchLaneRow {
  bottomConnections: BranchLaneConnection[];
  bottomLanes: BranchLaneSegment[];
  dotColor: string;
  lane: number;
  sha: string;
  topLanes: BranchLaneSegment[];
}

export interface BranchLaneLayout {
  maxLane: number;
  rows: BranchLaneRow[];
}

function findLaneIndex(lanes: Array<ActiveLane | null>, sha: string): number {
  return lanes.findIndex((lane) => lane?.sha === sha);
}

function findOpenLane(lanes: Array<ActiveLane | null>, preferredIndex: number): number {
  for (let index = preferredIndex; index < lanes.length; index++) {
    if (!lanes[index]) {
      return index;
    }
  }

  return lanes.length;
}

function compactLanes(lanes: Array<ActiveLane | null>): Array<ActiveLane | null> {
  const nextLanes = [...lanes];

  while (nextLanes.length > 0 && !nextLanes[nextLanes.length - 1]) {
    nextLanes.pop();
  }

  return nextLanes;
}

function toSegments(lanes: Array<ActiveLane | null>): BranchLaneSegment[] {
  return lanes.flatMap((lane, index) => (
    lane ? [{ lane: index, color: lane.color }] : []
  ));
}

export function buildBranchLaneLayout(commitsNewestFirst: ICommitInfo[]): BranchLaneLayout {
  const rows: BranchLaneRow[] = [];
  let colorIndex = 0;
  let maxLane = 0;
  let activeLanes: Array<ActiveLane | null> = [];

  for (const commit of commitsNewestFirst) {
    let laneIndex = findLaneIndex(activeLanes, commit.sha);

    if (laneIndex === -1) {
      laneIndex = findOpenLane(activeLanes, 0);
      activeLanes[laneIndex] = {
        color: BRANCH_COLORS[colorIndex % BRANCH_COLORS.length],
        sha: commit.sha,
      };
      colorIndex += 1;
    }

    const currentLane = activeLanes[laneIndex];
    if (!currentLane) {
      continue;
    }

    const nextLanes = activeLanes.map((lane) => (lane ? { ...lane } : null));
    const bottomConnections: BranchLaneConnection[] = [];
    const firstParentSha = commit.parents[0];

    if (!firstParentSha) {
      nextLanes[laneIndex] = null;
    } else {
      const firstParentLaneIndex = findLaneIndex(nextLanes, firstParentSha);

      if (firstParentLaneIndex === -1 || firstParentLaneIndex === laneIndex) {
        nextLanes[laneIndex] = {
          color: currentLane.color,
          sha: firstParentSha,
        };
      } else {
        nextLanes[laneIndex] = null;
        bottomConnections.push({
          color: currentLane.color,
          fromLane: laneIndex,
          toLane: firstParentLaneIndex,
        });
      }
    }

    for (const parentSha of commit.parents.slice(1)) {
      let parentLaneIndex = findLaneIndex(nextLanes, parentSha);

      if (parentLaneIndex === -1) {
        parentLaneIndex = findOpenLane(nextLanes, laneIndex + 1);
        nextLanes[parentLaneIndex] = {
          color: BRANCH_COLORS[colorIndex % BRANCH_COLORS.length],
          sha: parentSha,
        };
        colorIndex += 1;
      }

      bottomConnections.push({
        color: nextLanes[parentLaneIndex]?.color ?? currentLane.color,
        fromLane: laneIndex,
        toLane: parentLaneIndex,
      });
    }

    const compactedLanes = compactLanes(nextLanes);

    rows.push({
      bottomConnections,
      bottomLanes: toSegments(compactedLanes),
      dotColor: currentLane.color,
      lane: laneIndex,
      sha: commit.sha,
      topLanes: toSegments(activeLanes),
    });

    maxLane = Math.max(
      maxLane,
      laneIndex,
      ...compactedLanes.flatMap((lane, index) => (lane ? [index] : [])),
    );
    activeLanes = compactedLanes;
  }

  return { maxLane, rows };
}
