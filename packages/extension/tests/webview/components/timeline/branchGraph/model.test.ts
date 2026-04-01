import { describe, expect, it } from 'vitest';
import type { ICommitInfo } from '../../../../../src/shared/timeline/types';
import { buildBranchGraphModel } from '../../../../../src/webview/components/timeline/branchGraph/model';

function createCommit(
  sha: string,
  timestamp: number,
  parents: string[] = [],
): ICommitInfo {
  return {
    author: 'Dev',
    message: sha,
    parents,
    sha,
    timestamp,
  };
}

describe('timeline/branchGraph/model', () => {
  it('keeps linear histories on a single lane', () => {
    const model = buildBranchGraphModel([
      createCommit('head', 300, ['middle']),
      createCommit('middle', 200, ['root']),
      createCommit('root', 100),
    ]);

    expect(model.maxLane).toBe(0);
    expect(model.rows).toHaveLength(3);
    expect(model.rows.map((row) => row.lane)).toEqual([0, 0, 0]);
    expect(model.rows[0]).toMatchObject({
      bottomConnections: [],
      bottomLanes: [{ lane: 0 }],
      lane: 0,
      sha: 'head',
      topConnections: [],
      topLanes: [],
    });
    expect(model.rows[2]).toMatchObject({
      bottomConnections: [],
      bottomLanes: [],
      lane: 0,
      sha: 'root',
      topConnections: [],
      topLanes: [{ lane: 0 }],
    });
  });

  it('assigns a second lane for a merged side branch and collapses it after the join', () => {
    const model = buildBranchGraphModel([
      createCommit('merge', 400, ['main', 'feature']),
      createCommit('main', 300, ['root']),
      createCommit('feature', 350, ['root']),
      createCommit('root', 100),
    ]);

    expect(model.maxLane).toBe(1);
    expect(model.rows.map((row) => ({ sha: row.sha, lane: row.lane }))).toEqual([
      { sha: 'merge', lane: 0 },
      { sha: 'main', lane: 0 },
      { sha: 'feature', lane: 1 },
      { sha: 'root', lane: 0 },
    ]);
    expect(model.rows[0]).toMatchObject({
      bottomConnections: [{ fromLane: 0, toLane: 1 }],
      bottomLanes: [{ lane: 0 }, { lane: 1 }],
      lane: 0,
      sha: 'merge',
      topConnections: [],
      topLanes: [],
    });
    expect(model.rows[3]).toMatchObject({
      bottomConnections: [],
      bottomLanes: [],
      lane: 0,
      sha: 'root',
      topConnections: [{ fromLane: 1, toLane: 0 }],
      topLanes: [{ lane: 0 }, { lane: 1 }],
    });
  });

  it('stops side-branch lanes when the parent falls outside the visible history', () => {
    const model = buildBranchGraphModel([
      createCommit('merge', 400, ['main', 'feature']),
      createCommit('main', 300, ['root']),
      createCommit('root', 100),
    ]);

    expect(model.maxLane).toBe(0);
    expect(model.rows.map((row) => ({ sha: row.sha, lane: row.lane }))).toEqual([
      { sha: 'merge', lane: 0 },
      { sha: 'main', lane: 0 },
      { sha: 'root', lane: 0 },
    ]);
    expect(model.rows[0]).toMatchObject({
      bottomConnections: [],
      bottomLanes: [{ lane: 0 }],
      lane: 0,
      sha: 'merge',
      topConnections: [],
      topLanes: [],
    });
    expect(model.rows[2]).toMatchObject({
      bottomConnections: [],
      bottomLanes: [],
      lane: 0,
      sha: 'root',
      topConnections: [],
      topLanes: [{ lane: 0 }],
    });
  });
});
