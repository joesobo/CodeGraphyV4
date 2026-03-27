import { describe, expect, it } from 'vitest';
import { findCohesionClusters } from '../../src/organize/cohesionClusters';
import type { ImportAdjacency } from '../../src/organize/importGraph';

/**
 * Helper to create an ImportAdjacency map.
 */
function createImportGraph(edges: Record<string, string[]>): ImportAdjacency {
  const graph: ImportAdjacency = new Map();
  const allFiles = new Set<string>();

  // Collect all files
  for (const [from, tos] of Object.entries(edges)) {
    allFiles.add(from);
    for (const to of tos) {
      allFiles.add(to);
    }
  }

  // Initialize all files
  for (const file of allFiles) {
    graph.set(file, new Set(edges[file] ?? []));
  }

  return graph;
}

describe('findCohesionClusters', () => {
  it('groups files by shared prefix', () => {
    const fileNames = ['reportBlocks.ts', 'reportComparison.ts', 'reportExamples.ts', 'scoreExample.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({
      prefix: 'report',
      confidence: 'prefix-only',
      memberCount: 3,
      suggestedFolder: 'report'
    });
    expect(clusters[0]!.members).toEqual(['reportBlocks.ts', 'reportComparison.ts', 'reportExamples.ts']);
  });

  it('excludes prefix groups below minClusterSize', () => {
    const fileNames = ['reportBlocks.ts', 'reportComparison.ts', 'scoreExample.ts', 'scoreMetric.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // report group has only 2 members, score group has 2 members
    expect(clusters).toHaveLength(0);
  });

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
    const prefixCluster = clusters.find((c) => c.prefix === 'report');
    const importsCluster = clusters.find((c) => c.confidence === 'imports-only');

    expect(prefixCluster).toMatchObject({
      confidence: 'prefix-only',
      memberCount: 3
    });
    expect(importsCluster).toMatchObject({
      confidence: 'imports-only',
      memberCount: 3
    });
  });

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

  it('sorts results by memberCount descending, then prefix alphabetically', () => {
    const fileNames = [
      'aBlock1.ts',
      'aBlock2.ts',
      'aBlock3.ts',
      'bBlock1.ts',
      'bBlock2.ts',
      'cBlock1.ts',
      'cBlock2.ts',
      'cBlock3.ts',
      'cBlock4.ts'
    ];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 2);

    expect(clusters).toHaveLength(3);
    // Should be sorted: c (4 members), a (3 members), b (2 members)
    expect(clusters[0]!.prefix).toBe('c');
    expect(clusters[0]!.memberCount).toBe(4);
    expect(clusters[1]!.prefix).toBe('a');
    expect(clusters[1]!.memberCount).toBe(3);
    expect(clusters[2]!.prefix).toBe('b');
    expect(clusters[2]!.memberCount).toBe(2);
  });

  it('sorts members within each cluster alphabetically', () => {
    const fileNames = ['reportZ.ts', 'reportA.ts', 'reportM.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters[0]!.members).toEqual(['reportA.ts', 'reportM.ts', 'reportZ.ts']);
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

  it('handles files with camelCase or PascalCase prefixes', () => {
    const fileNames = ['userProfile.ts', 'userAccount.ts', 'userSettings.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.prefix).toBe('user');
    expect(clusters[0]!.suggestedFolder).toBe('user');
  });

  it('handles kebab-case filenames', () => {
    const fileNames = ['report-blocks.ts', 'report-comparison.ts', 'report-examples.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.prefix).toBe('report');
  });

  it('handles .test.ts and .spec.ts extensions', () => {
    const fileNames = ['utils.ts', 'utils.test.ts', 'helper.ts', 'helper.test.ts', 'helper.spec.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.prefix).toBe('helper');
    expect(clusters[0]!.memberCount).toBe(3);
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

  it('lowercases suggestedFolder regardless of prefix case', () => {
    const fileNames = ['ReportA.ts', 'ReportB.ts', 'ReportC.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters[0]!.suggestedFolder).toBe('report');
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

    const dataCluster = clusters.find((c) => c.prefix === 'data');
    const logCluster = clusters.find((c) => c.prefix === 'log');
    const importsCluster = clusters.find((c) => c.confidence === 'imports-only');

    expect(dataCluster?.confidence).toBe('prefix+imports');
    expect(logCluster?.confidence).toBe('prefix-only');
    expect(importsCluster?.confidence).toBe('imports-only');
  });

  it('handles files with numeric tokens', () => {
    const fileNames = ['handler1.ts', 'handler2.ts', 'handler3.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.prefix).toBe('handler');
  });
});
