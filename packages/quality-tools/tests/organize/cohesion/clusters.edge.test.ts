import { describe, expect, it } from 'vitest';
import { findCohesionClusters } from '../../../src/organize/cohesion/clusters';
import { createImportGraph } from '../testHelpers';

describe('findCohesionClusters - edge cases and complex scenarios', () => {
  it('returns empty list for empty input', () => {
    const fileNames: string[] = [];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toEqual([]);
  });

  it('returns empty list when all groups are singletons', () => {
    const fileNames = ['alpha.ts', 'beta.ts', 'gamma.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toEqual([]);
  });

  it('handles mixed prefix and import clusters', () => {
    const fileNames = [
      'reportA.ts',
      'reportB.ts',
      'reportC.ts',
      'foo.ts',
      'bar.ts',
      'baz.ts'
    ];
    const graph = createImportGraph({
      'foo.ts': ['bar.ts'],
      'bar.ts': ['baz.ts'],
      'reportA.ts': [],
      'reportB.ts': [],
      'reportC.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(2);
    const prefixCluster = clusters.find((cluster) => cluster.prefix === 'report');
    const importsCluster = clusters.find((cluster) => cluster.confidence === 'imports-only');

    expect(prefixCluster).toMatchObject({
      confidence: 'prefix-only',
      memberCount: 3
    });
    expect(importsCluster).toMatchObject({
      confidence: 'imports-only',
      memberCount: 3
    });
  });

  it('does not double-count files in multiple clusters', () => {
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

    // Should have 2 clusters (report and foo/bar/baz)
    expect(clusters).toHaveLength(2);

    // Count total members
    let totalMembers = 0;
    for (const cluster of clusters) {
      totalMembers += cluster.members.length;
    }
    expect(totalMembers).toBe(6);
  });

  it('handles complex mixed scenario with multiple signal types', () => {
    const fileNames = [
      // prefix+imports cluster
      'dataFetcher.ts',
      'dataParser.ts',
      'dataValidator.ts',
      // prefix-only cluster
      'logError.ts',
      'logWarning.ts',
      'logInfo.ts',
      // imports-only cluster (no shared prefix)
      'aaa.ts',
      'bbb.ts',
      'ccc.ts'
    ];
    const graph = createImportGraph({
      'dataFetcher.ts': ['dataParser.ts'],
      'dataParser.ts': ['dataValidator.ts'],
      'dataValidator.ts': [],
      'aaa.ts': ['bbb.ts'],
      'bbb.ts': ['ccc.ts'],
      'ccc.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(3);

    const dataCluster = clusters.find((cluster) => cluster.prefix === 'data');
    const logCluster = clusters.find((cluster) => cluster.prefix === 'log');
    const importsCluster = clusters.find((cluster) => cluster.confidence === 'imports-only');

    expect(dataCluster?.confidence).toBe('prefix+imports');
    expect(logCluster?.confidence).toBe('prefix-only');
    expect(importsCluster?.confidence).toBe('imports-only');
  });

  it('initializes clusters correctly with conditional assignment', () => {
    const fileNames = ['reportA.ts', 'reportB.ts', 'otherA.ts'];
    const graph = createImportGraph({
      'reportA.ts': ['reportB.ts'],
      'reportB.ts': [],
      'otherA.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 2);

    // 'report' prefix appears twice (reportA, reportB) - meets minSize of 2
    // 'other' prefix appears once - below minSize
    // Import component: reportA -> reportB (2 files, meets minSize)
    // Report prefix overlaps with import component, so prefix+imports
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.prefix).toBe('report');
  });

  it('derives prefix from most common token when all files in import component have tokens', () => {
    const fileNames = ['fileX.ts', 'fileY.ts', 'fileZ.ts', 'otherA.ts'];
    const graph = createImportGraph({
      'fileX.ts': ['fileY.ts'],
      'fileY.ts': ['fileZ.ts'],
      'fileZ.ts': ['otherA.ts'],
      'otherA.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 4);

    // All 4 files connected by imports
    // 'file' appears 3 times, 'other' appears 1 time
    // Should derive 'file' as most common
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.prefix).toBe('file');
  });

  it('falls back to first file token when most common token is empty', () => {
    // Files with minimal tokens that might yield empty prefix
    const fileNames = ['x.ts', 'y.ts', 'z.ts'];
    const graph = createImportGraph({
      'x.ts': ['y.ts'],
      'y.ts': ['z.ts'],
      'z.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // All 3 connected, single-char prefixes, should use first file's token
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.prefix).toBe('x');
  });

  it('checks component coverage before processing import components', () => {
    const fileNames = [
      'reportA.ts',
      'reportB.ts',
      'reportC.ts',
      'dataX.ts',
      'dataY.ts',
      'dataZ.ts'
    ];
    const graph = createImportGraph({
      'reportA.ts': ['reportB.ts'],
      'reportB.ts': ['reportC.ts'],
      'reportC.ts': [],
      'dataX.ts': ['dataY.ts'],
      'dataY.ts': ['dataZ.ts'],
      'dataZ.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // Should have 2 clusters: report (prefix-based) and data (import-based)
    // report component gets assigned first, so data component is not covered
    expect(clusters).toHaveLength(2);
    expect(clusters.some((cluster) => cluster.prefix === 'report')).toBe(true);
    expect(clusters.some((cluster) => cluster.prefix === 'data')).toBe(true);
  });

  it('handles case where import component overlaps partially with prefix group', () => {
    const fileNames = ['apiA.ts', 'apiB.ts', 'apiC.ts', 'apiD.ts', 'apiE.ts'];
    const graph = createImportGraph({
      'apiA.ts': ['apiB.ts'],
      'apiB.ts': ['apiC.ts'],
      'apiC.ts': [],
      'apiD.ts': [],
      'apiE.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 5);

    // All 5 have 'api' prefix (meets minSize 5)
    // Only 3 are in import component (below minSize 5), so import component filtered out
    // Result: prefix-only (no valid overlapping component)
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.confidence).toBe('prefix-only');
    expect(clusters[0]!.memberCount).toBe(5);
  });

  it('requires 50% overlap for prefix+imports confidence with valid import component', () => {
    const fileNames = ['utilA.ts', 'utilB.ts', 'utilC.ts', 'utilD.ts'];
    const graph = createImportGraph({
      'utilA.ts': ['utilB.ts'],
      'utilB.ts': ['utilC.ts'],
      'utilC.ts': ['utilD.ts'],
      'utilD.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 2);

    // All 4 have 'util' prefix (meets minSize 2)
    // All 4 are import-connected (meets minSize 2)
    // 4/4 = 100% overlap (>= 50%), so should be prefix+imports
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.confidence).toBe('prefix+imports');
  });

  it('marks as prefix-only when overlap is below 50%', () => {
    const fileNames = ['funcA.ts', 'funcB.ts', 'funcC.ts', 'funcD.ts', 'funcE.ts'];
    const graph = createImportGraph({
      'funcA.ts': ['funcB.ts'],
      'funcB.ts': [],
      'funcC.ts': [],
      'funcD.ts': [],
      'funcE.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 5);

    // All 5 have 'func' prefix, 2 are import-connected
    // 2/5 = 40% overlap (< 50%), so should be prefix-only
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.confidence).toBe('prefix-only');
  });

  it('handles sorting with equal member counts and alphabetic ordering', () => {
    const fileNames = [
      'zoneA.ts',
      'zoneB.ts',
      'zoneC.ts',
      'alphaX.ts',
      'alphaY.ts',
      'alphaZ.ts'
    ];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(2);
    // Both have 3 members, should be sorted alphabetically by prefix
    expect(clusters[0]!.prefix).toBe('alpha');
    expect(clusters[1]!.prefix).toBe('zone');
  });

  it('handles backward edges in import graph traversal', () => {
    const fileNames = ['a.ts', 'b.ts', 'c.ts'];
    const graph = createImportGraph({
      'a.ts': [],
      'b.ts': ['a.ts'],  // b imports a (backward edge)
      'c.ts': ['b.ts']   // c imports b
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // All three should be connected via undirected import graph
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.memberCount).toBe(3);
  });

  it('processes all valid import components not covered by prefix groups', () => {
    const fileNames = [
      'reportA.ts',
      'reportB.ts',
      'reportC.ts',
      'unrelated1.ts',
      'unrelated2.ts',
      'unrelated3.ts'
    ];
    const graph = createImportGraph({
      'reportA.ts': [],
      'reportB.ts': [],
      'reportC.ts': [],
      'unrelated1.ts': ['unrelated2.ts'],
      'unrelated2.ts': ['unrelated3.ts'],
      'unrelated3.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // Should have 2 clusters: report (prefix) and unrelated (import)
    expect(clusters).toHaveLength(2);
    expect(
      clusters
        .map((cluster) => cluster.memberCount)
        .sort((leftCount, rightCount) => rightCount - leftCount)
    ).toEqual([3, 3]);
  });

  it('handles overlap detection when component has no intersection', () => {
    const fileNames = [
      'prefixA.ts',
      'prefixB.ts',
      'prefixC.ts',
      'otherX.ts',
      'otherY.ts',
      'otherZ.ts'
    ];
    const graph = createImportGraph({
      'prefixA.ts': [],
      'prefixB.ts': [],
      'prefixC.ts': [],
      'otherX.ts': ['otherY.ts'],
      'otherY.ts': ['otherZ.ts'],
      'otherZ.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // prefix group and import component have no members in common
    const prefixCluster = clusters.find((cluster) => cluster.prefix === 'prefix');
    expect(prefixCluster?.confidence).toBe('prefix-only');
  });

  it('correctly assigns all members to one cluster in single-component scenario', () => {
    const fileNames = [
      'docViewer.ts',
      'docParser.ts',
      'docEditor.ts'
    ];
    const graph = createImportGraph({
      'docViewer.ts': ['docParser.ts'],
      'docParser.ts': ['docEditor.ts'],
      'docEditor.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(1);
    const cluster = clusters[0];
    expect(cluster?.members).toHaveLength(3);
    expect(cluster?.members.sort()).toEqual(['docEditor.ts', 'docParser.ts', 'docViewer.ts']);
  });

  it('handles minClusterSize edge case where prefix and import components differ', () => {
    const fileNames = [
      'utilHelper.ts',
      'utilFormat.ts',
      'dataA.ts',
      'dataB.ts',
      'dataC.ts'
    ];
    const graph = createImportGraph({
      'utilHelper.ts': ['utilFormat.ts'],
      'utilFormat.ts': [],
      'dataA.ts': ['dataB.ts'],
      'dataB.ts': ['dataC.ts'],
      'dataC.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // util has only 2 members (below minSize), data has 3 (meets minSize)
    // Only data cluster should be returned
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.prefix).toBe('data');
  });

  it('preserves all files in import component even with no overlapping members', () => {
    const fileNames = ['x1.ts', 'x2.ts', 'y1.ts', 'y2.ts', 'y3.ts'];
    const graph = createImportGraph({
      'x1.ts': ['x2.ts'],
      'y1.ts': ['y2.ts'],
      'y2.ts': ['y3.ts']
    });

    const clusters = findCohesionClusters(fileNames, graph, 2);

    // Should have 2 clusters: x (2 members) and y (3 members)
    expect(clusters).toHaveLength(2);
    const totalMembers = clusters.reduce((memberTotal, cluster) => memberTotal + cluster.members.length, 0);
    expect(totalMembers).toBe(5);
  });

  it('correctly handles overlap calculation with unequal set sizes', () => {
    const fileNames = [
      'toolA.ts',
      'toolB.ts',
      'toolC.ts',
      'toolD.ts',
      'toolE.ts',
      'toolF.ts',
      'toolG.ts'
    ];
    const graph = createImportGraph({
      'toolA.ts': ['toolB.ts'],
      'toolB.ts': ['toolC.ts'],
      'toolC.ts': ['toolD.ts'],
      'toolD.ts': ['toolE.ts'],
      'toolE.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 5);

    // tool prefix: 7 members
    // import component: 5 members (toolA-toolE)
    // smaller set is 5, need 50% = ceil(5 * 50 / 100) = 3 members in common
    // all 5 import members overlap, so 5 >= 3, meets threshold
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.confidence).toBe('prefix+imports');
  });
});
