import { describe, expect, it } from 'vitest';
import { findCohesionClusters } from '../../../src/organize/cohesion/clusters';
import { createImportGraph } from '../testHelpers';

describe('findCohesionClusters - import-based clustering', () => {
  it('identifies import-only clusters', () => {
    const fileNames = ['foo.ts', 'bar.ts', 'baz.ts'];
    const graph = createImportGraph({
      'foo.ts': ['bar.ts'],
      'bar.ts': ['baz.ts'],
      'baz.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({
      confidence: 'imports-only',
      memberCount: 3
    });
    expect(clusters[0]!.members.sort()).toEqual(['bar.ts', 'baz.ts', 'foo.ts']);
  });

  it('marks clusters as prefix+imports when prefix and import signals overlap', () => {
    const fileNames = ['reportA.ts', 'reportB.ts', 'reportC.ts'];
    const graph = createImportGraph({
      'reportA.ts': ['reportB.ts'],
      'reportB.ts': ['reportC.ts'],
      'reportC.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.confidence).toBe('prefix+imports');
  });

  it('derives prefix for import-only clusters from most common first token', () => {
    const fileNames = [
      'reportA.ts',
      'reportB.ts',
      'scoreC.ts'
    ];
    const graph = createImportGraph({
      'reportA.ts': ['reportB.ts'],
      'reportB.ts': ['scoreC.ts'],
      'scoreC.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // All three form one component, 'report' appears twice, 'score' once
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.prefix).toBe('report');
  });

  it('treats bidirectional imports as a single connected component', () => {
    const fileNames = ['a.ts', 'b.ts', 'c.ts'];
    const graph = createImportGraph({
      'a.ts': ['b.ts'],
      'b.ts': ['a.ts', 'c.ts'],
      'c.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.memberCount).toBe(3);
  });

  it('separates disconnected import components', () => {
    const fileNames = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts', 'f.ts'];
    const graph = createImportGraph({
      'a.ts': ['b.ts'],
      'b.ts': ['c.ts'],
      'd.ts': ['e.ts'],
      'e.ts': ['f.ts']
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(2);
  });

  it('requires >= 50% overlap for prefix+imports confidence', () => {
    // 4 files with report prefix, 3 import-connected, 1 isolated
    const fileNames = ['reportA.ts', 'reportB.ts', 'reportC.ts', 'reportD.ts'];
    const graph = createImportGraph({
      'reportA.ts': ['reportB.ts'],
      'reportB.ts': ['reportC.ts'],
      'reportC.ts': [],
      'reportD.ts': []  // isolated from the import graph
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // Should be prefix+imports since 3 of 4 members (75%) are in the import component
    expect(clusters[0]!.confidence).toBe('prefix+imports');
  });

  it('counts tokens correctly for most common prefix derivation', () => {
    // 3 files with 'data' prefix, 1 with 'util' prefix, all connected by imports
    const fileNames = ['dataFoo.ts', 'dataBar.ts', 'dataBaz.ts', 'utilHelper.ts'];
    const graph = createImportGraph({
      'dataFoo.ts': ['dataBar.ts'],
      'dataBar.ts': ['dataBaz.ts'],
      'dataBaz.ts': ['utilHelper.ts'],
      'utilHelper.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 4);

    // All 4 are connected by imports, derives prefix from most common token
    // 'data' appears 3 times, 'util' appears 1 time, so prefix should be 'data'
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.prefix).toBe('data');
  });

  it('handles empty array for derivePrefix fallback', () => {
    const fileNames = ['x.ts', 'y.ts', 'z.ts'];
    const graph = createImportGraph({
      'x.ts': ['y.ts'],
      'y.ts': ['z.ts'],
      'z.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // All three connected, no common prefix, should use first file's first token
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.prefix).toBe('x');
  });

  it('tests overlap with prefix meeting minSize but import component below', () => {
    // 5 files with prefix 'data', 4 import-connected, 1 isolated
    const fileNames = ['dataA.ts', 'dataB.ts', 'dataC.ts', 'dataD.ts', 'dataE.ts'];
    const graph = createImportGraph({
      'dataA.ts': ['dataB.ts'],
      'dataB.ts': ['dataC.ts'],
      'dataC.ts': ['dataD.ts'],
      'dataD.ts': [],
      'dataE.ts': []  // isolated from import graph
    });

    const clusters = findCohesionClusters(fileNames, graph, 5);

    // All 5 files have 'data' prefix, meets minSize of 5
    // Import component has 4 files (dataA, dataB, dataC, dataD) - below minSize
    // Since import component is below minSize, it's filtered out
    // So prefix group has no valid overlapping component
    // Result: prefix-only confidence
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.confidence).toBe('prefix-only');
  });

  it('tests overlap detection with complete overlap', () => {
    // Both prefix and import components have the same 3 files
    const fileNames = ['otherA.ts', 'otherB.ts', 'otherC.ts'];
    const graph = createImportGraph({
      'otherA.ts': ['otherB.ts'],
      'otherB.ts': ['otherC.ts'],
      'otherC.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(1);
    const cluster = clusters[0];

    // prefix cluster overlaps completely with import component
    expect(cluster?.confidence).toBe('prefix+imports');
  });

  it('selects the first overlapping component when multiple components exist', () => {
    const fileNames = [
      'reportA.ts',
      'reportB.ts',
      'reportC.ts',
      'foo.ts',
      'bar.ts',
      'baz.ts'
    ];
    const graph = createImportGraph({
      'reportA.ts': ['reportB.ts'],
      'reportB.ts': ['reportC.ts'],
      'foo.ts': ['bar.ts'],
      'bar.ts': ['baz.ts']
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // report forms one import component (3 files)
    // foo/bar/baz forms another import component (3 files)
    // Both >= minSize 3, so both are valid import components
    // report prefix group will overlap with report import component
    // foo/bar/baz won't match any prefix (each starts with different token)
    expect(clusters).toHaveLength(2);
    const reportCluster = clusters.find((cluster) => cluster.prefix === 'report');
    expect(reportCluster?.confidence).toBe('prefix+imports');
  });

  it('derives prefix using first file fallback when no common tokens', () => {
    const fileNames = ['x.ts', 'y.ts', 'z.ts'];
    const graph = createImportGraph({
      'x.ts': ['y.ts'],
      'y.ts': ['z.ts'],
      'z.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // All connected by imports, each has unique first token
    // Most common token count is tied (1 each)
    // Should use first file's token as fallback
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.prefix).toBe('x');
  });

  it('handles derivation when most common token exists among unequal frequencies', () => {
    const fileNames = [
      'dataX.ts',
      'dataY.ts',
      'dataZ.ts',
      'utilHelper.ts',
      'otherFile.ts'
    ];
    const graph = createImportGraph({
      'dataX.ts': ['dataY.ts'],
      'dataY.ts': ['dataZ.ts'],
      'dataZ.ts': ['utilHelper.ts'],
      'utilHelper.ts': ['otherFile.ts'],
      'otherFile.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 5);

    // All 5 connected by imports
    // data: 3, util: 1, other: 1
    // Most common is data (count 3)
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.prefix).toBe('data');
  });

  it('distinguishes between undirected edges in both directions', () => {
    const fileNames = ['a.ts', 'b.ts', 'c.ts', 'd.ts'];
    const graph = createImportGraph({
      'a.ts': ['b.ts'],
      'b.ts': ['c.ts'],
      'c.ts': ['a.ts'],  // creates cycle
      'd.ts': ['a.ts']   // external connection
    });

    const clusters = findCohesionClusters(fileNames, graph, 4);

    // All 4 should be connected as undirected
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.memberCount).toBe(4);
  });

  it('handles multiple disconnected components correctly', () => {
    const fileNames = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts', 'f.ts'];
    const graph = createImportGraph({
      'a.ts': ['b.ts'],
      'b.ts': ['c.ts'],
      'c.ts': [],
      'd.ts': ['e.ts'],
      'e.ts': ['f.ts'],
      'f.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // Two components: a-b-c and d-e-f
    expect(clusters).toHaveLength(2);
    expect(
      clusters
        .map((cluster) => cluster.memberCount)
        .sort((leftCount, rightCount) => leftCount - rightCount)
    ).toEqual([3, 3]);
  });

  it('handles files with no tokens in name for prefix derivation', () => {
    // Edge case: files that start with numbers or special chars
    const fileNames = ['123File.ts', '456Item.ts', '789Other.ts'];
    const graph = createImportGraph({
      '123File.ts': ['456Item.ts'],
      '456Item.ts': ['789Other.ts'],
      '789Other.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // All connected by imports
    // Tokenize would extract first token from each
    expect(clusters).toHaveLength(1);
    // The prefix would be whatever the first token is
    expect(clusters[0]!.memberCount).toBe(3);
  });

  it('verifies no files are lost during component merging', () => {
    const fileNames = [
      'modelA.ts',
      'modelB.ts',
      'modelC.ts',
      'viewX.ts',
      'viewY.ts',
      'viewZ.ts'
    ];
    const graph = createImportGraph({
      'modelA.ts': ['modelB.ts'],
      'modelB.ts': ['modelC.ts'],
      'modelC.ts': [],
      'viewX.ts': ['viewY.ts'],
      'viewY.ts': ['viewZ.ts'],
      'viewZ.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // Should have 2 clusters
    const allMembers: string[] = [];
    for (const cluster of clusters) {
      allMembers.push(...cluster.members);
    }
    allMembers.sort();

    const expectedMembers = ['modelA.ts', 'modelB.ts', 'modelC.ts', 'viewX.ts', 'viewY.ts', 'viewZ.ts'];
    expect(allMembers).toEqual(expectedMembers);
  });

  it('handles a long import chain correctly', () => {
    const fileNames = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'];
    const graph = createImportGraph({
      'a.ts': ['b.ts'],
      'b.ts': ['c.ts'],
      'c.ts': ['d.ts'],
      'd.ts': ['e.ts'],
      'e.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 5);

    // Linear chain, all connected
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.memberCount).toBe(5);
  });

  it('respects minClusterSize filtering for import components', () => {
    const fileNames = [
      'a.ts',
      'b.ts',
      'c.ts',
      'd.ts',
      'e.ts'
    ];
    const graph = createImportGraph({
      'a.ts': ['b.ts'],
      'b.ts': [],
      'c.ts': ['d.ts'],
      'd.ts': [],
      'e.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // a-b component: 2 members (below minSize 3)
    // c-d component: 2 members (below minSize 3)
    // e: 1 member
    // No valid clusters
    expect(clusters).toHaveLength(0);
  });

  it('includes all files from component regardless of prefix uniformity', () => {
    const fileNames = [
      'coreA.ts',
      'extensionB.ts',
      'helperC.ts'
    ];
    const graph = createImportGraph({
      'coreA.ts': ['extensionB.ts'],
      'extensionB.ts': ['helperC.ts'],
      'helperC.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // All connected by imports despite no shared prefix
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.confidence).toBe('imports-only');
    expect(clusters[0]!.memberCount).toBe(3);
    expect(clusters[0]!.members).toHaveLength(3);
  });
});
