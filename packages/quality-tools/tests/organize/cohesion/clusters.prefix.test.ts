import { describe, expect, it } from 'vitest';
import { findCohesionClusters } from '../../../src/organize/cohesion/clusters';
import { createImportGraph } from '../testHelpers';

describe('findCohesionClusters - prefix-based clustering', () => {
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

  it('handles camelCase or PascalCase prefixes', () => {
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

  it('handles files with numeric tokens', () => {
    const fileNames = ['handler1.ts', 'handler2.ts', 'handler3.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.prefix).toBe('handler');
  });

  it('lowercases suggestedFolder regardless of prefix case', () => {
    const fileNames = ['ReportA.ts', 'ReportB.ts', 'ReportC.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters[0]!.suggestedFolder).toBe('report');
  });

  it('extracts lowercase prefix correctly', () => {
    const fileNames = ['ReportA.ts', 'ReportB.ts', 'ReportC.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters[0]!.prefix).toBe('report');
    expect(clusters[0]!.suggestedFolder).toBe('report');
  });

  it('filters out clusters below minimum size threshold', () => {
    const fileNames = [
      'reportA.ts', 'reportB.ts',  // 2 files, below minSize of 3
      'userX.ts', 'userY.ts', 'userZ.ts'  // 3 files, meets minSize
    ];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.prefix).toBe('user');
  });

  it('handles Array.from properly in member array creation', () => {
    const fileNames = ['prefixZ.ts', 'prefixA.ts', 'prefixM.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // Members should be sorted
    expect(clusters[0]!.members).toEqual(['prefixA.ts', 'prefixM.ts', 'prefixZ.ts']);
  });

  it('builds prefix groups from all provided files', () => {
    const fileNames = [
      'userProfile.ts',
      'userAccount.ts',
      'userSettings.ts',
      'productList.ts',
      'productDetail.ts'
    ];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // user group: 3 files (meets minSize 3)
    // product group: 2 files (below minSize 3)
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.prefix).toBe('user');
  });

  it('includes all members of a valid prefix group', () => {
    const fileNames = ['toolA.ts', 'toolB.ts', 'toolC.ts', 'toolD.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 2);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.members).toHaveLength(4);
    expect(clusters[0]!.memberCount).toBe(4);
  });

  it('handles exactly minClusterSize for prefix group inclusion', () => {
    const fileNames = ['blockA.ts', 'blockB.ts', 'blockC.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // block group has exactly 3 files, minSize is 3
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.memberCount).toBe(3);
  });

  it('excludes group with exactly minClusterSize - 1 members', () => {
    const fileNames = ['dataX.ts', 'dataY.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // data group has 2 files, minSize is 3 (below threshold)
    expect(clusters).toHaveLength(0);
  });

  it('processes each prefix group and creates cluster independently', () => {
    const fileNames = [
      'utilOne.ts',
      'utilTwo.ts',
      'utilThree.ts',
      'helperA.ts',
      'helperB.ts',
      'helperC.ts'
    ];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(2);
    const prefixes = clusters.map((cluster) => cluster.prefix).sort();
    expect(prefixes).toEqual(['helper', 'util']);
  });

  it('adds all prefix group members to assigned tracking set', () => {
    const fileNames = [
      'aFunc.ts',
      'aFunc2.ts',
      'aFunc3.ts',
      'bFunc.ts',
      'bFunc2.ts',
      'bFunc3.ts'
    ];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // Should have 2 clusters
    const totalMembers = clusters.reduce((memberTotal, cluster) => memberTotal + cluster.members.length, 0);
    expect(totalMembers).toBe(6);
  });

  it('creates correct memberCount during cluster construction', () => {
    const fileNames = ['itemA.ts', 'itemB.ts', 'itemC.ts', 'itemD.ts', 'itemE.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.memberCount).toBe(5);
    expect(clusters[0]!.members).toHaveLength(5);
  });

  it('sets prefix to lowercase during prefix group cluster creation', () => {
    const fileNames = ['ComponentA.ts', 'ComponentB.ts', 'ComponentC.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters[0]!.prefix).toBe('component');
  });

  it('sets suggestedFolder to lowercase prefix', () => {
    const fileNames = ['ServiceX.ts', 'ServiceY.ts', 'ServiceZ.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters[0]!.suggestedFolder).toBe('service');
  });

  it('correctly identifies prefix-only confidence for prefix group clusters', () => {
    const fileNames = ['typeA.ts', 'typeB.ts', 'typeC.ts'];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // No import graph connections, so should be prefix-only
    expect(clusters[0]!.confidence).toBe('prefix-only');
  });

  it('marks prefix-only when no overlapping import component found', () => {
    const fileNames = ['configX.ts', 'configY.ts', 'configZ.ts'];
    const graph = createImportGraph({
      'configX.ts': [],
      'configY.ts': [],
      'configZ.ts': []
    });

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters[0]!.confidence).toBe('prefix-only');
  });

  it('maintains sorted member array from Set conversion', () => {
    const fileNames = ['thingZ.ts', 'thingA.ts', 'thingM.ts', 'thingB.ts'];
    const graph = createImportGraph({});

    // Should have extracted first token 'thing', grouped 4 files
    // But minSize is 3 so we need minSize=3
    const result = findCohesionClusters(fileNames, graph, 4);
    expect(result[0]!.members).toEqual(['thingA.ts', 'thingB.ts', 'thingM.ts', 'thingZ.ts']);
  });

  it('preserves all members when grouping by prefix', () => {
    const fileNames = [
      'nodeOne.ts',
      'nodeTwo.ts',
      'nodeThree.ts',
      'nodeFour.ts'
    ];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 2);

    const allMembers = clusters[0]!.members;
    expect(allMembers).toHaveLength(4);
    expect(new Set(allMembers).size).toBe(4); // All unique
  });

  it('handles files with multiple camelCase segments in prefix', () => {
    const fileNames = [
      'getUserProfile.ts',
      'getUserSettings.ts',
      'getUserPreferences.ts'
    ];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    // First token from 'getUserProfile' is 'get'
    expect(clusters[0]!.prefix).toBe('get');
  });

  it('separates groups with different first tokens regardless of file count', () => {
    const fileNames = [
      'parseA.ts',
      'parseB.ts',
      'parseC.ts',
      'validateX.ts',
      'validateY.ts',
      'validateZ.ts'
    ];
    const graph = createImportGraph({});

    const clusters = findCohesionClusters(fileNames, graph, 3);

    expect(clusters).toHaveLength(2);
    expect(clusters.map((cluster) => cluster.prefix).sort()).toEqual(['parse', 'validate']);
  });
});
