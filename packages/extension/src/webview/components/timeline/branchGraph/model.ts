import type { ICommitInfo } from '../../../../shared/timeline/types';

export interface BranchGraphLane {
  lane: number;
}

export interface BranchGraphConnection {
  fromLane: number;
  toLane: number;
}

export interface BranchGraphRow {
  bottomConnections: BranchGraphConnection[];
  bottomLanes: BranchGraphLane[];
  lane: number;
  sha: string;
  topConnections: BranchGraphConnection[];
  topLanes: BranchGraphLane[];
}

export interface BranchGraphModel {
  maxLane: number;
  rows: BranchGraphRow[];
}

export function buildBranchGraphModel(commitsNewestFirst: ICommitInfo[]): BranchGraphModel {
  const active: string[] = [];
  const visibleShas = new Set(commitsNewestFirst.map(({ sha }) => sha));
  const rows: BranchGraphRow[] = [];
  let maxLane = 0;

  for (const commit of commitsNewestFirst) {
    const activeBefore = active.slice();
    let lane = activeBefore.indexOf(commit.sha);

    if (lane === -1) {
      lane = active.length;
      active.push(commit.sha);
    }

    const topConnections = activeBefore.flatMap((sha, index) =>
      sha === commit.sha && index !== lane
        ? [{ fromLane: index, toLane: lane }]
        : [],
    );
    const bottomConnections: BranchGraphConnection[] = [];
    const visibleParents = commit.parents.filter((parentSha) => visibleShas.has(parentSha));

    if (visibleParents.length === 0) {
      removeAllOccurrences(active, commit.sha);
    } else {
      const [firstParentSha, ...otherParents] = visibleParents;

      if (firstParentSha) {
        active[lane] = firstParentSha;
      }

      let insertOffset = 0;
      for (const parentSha of otherParents) {
        const existingLane = active.findIndex((sha) => sha === parentSha);

        if (existingLane === -1) {
          const targetLane = lane + 1 + insertOffset;
          active.splice(targetLane, 0, parentSha);
          bottomConnections.push({ fromLane: lane, toLane: targetLane });
          insertOffset += 1;
          continue;
        }

        if (existingLane !== lane) {
          bottomConnections.push({ fromLane: lane, toLane: existingLane });
        }
      }
    }

    const topLanes = createLaneList(activeBefore.length);
    const bottomLanes = createLaneList(active.length);
    const rowMaxLane = Math.max(
      lane,
      ...topLanes.map(({ lane: topLane }) => topLane),
      ...bottomLanes.map(({ lane: bottomLane }) => bottomLane),
      ...topConnections.flatMap(({ fromLane, toLane }) => [fromLane, toLane]),
      ...bottomConnections.flatMap(({ fromLane, toLane }) => [fromLane, toLane]),
    );

    maxLane = Math.max(maxLane, rowMaxLane);
    rows.push({
      bottomConnections,
      bottomLanes,
      lane,
      sha: commit.sha,
      topConnections,
      topLanes,
    });
  }

  return { maxLane, rows };
}

function createLaneList(count: number): BranchGraphLane[] {
  return Array.from({ length: count }, (_, lane) => ({ lane }));
}

function removeAllOccurrences(active: string[], sha: string): void {
  for (let index = active.length - 1; index >= 0; index -= 1) {
    if (active[index] === sha) {
      active.splice(index, 1);
    }
  }
}
