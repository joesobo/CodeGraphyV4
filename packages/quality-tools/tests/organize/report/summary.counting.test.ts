import { describe, expect, it } from 'vitest';
import { summaryLines } from '../../../src/organize/report/summary';
import { createMetric, createCluster, createFileIssue } from '../testHelpers';

describe('summaryLines - counting', () => {
  it('counts low-info issues correctly', () => {
    const metric = createMetric({
      directoryPath: 'src/lowinfo/',
      fileIssues: [
        createFileIssue({ fileName: 'utils.ts', kind: 'low-info-banned' }),
        createFileIssue({ fileName: 'helpers.ts', kind: 'low-info-discouraged' })
      ]
    });

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('low-info: 2');
  });

  it('counts barrel issues correctly', () => {
    const metric = createMetric({
      directoryPath: 'src/barrels/',
      fileIssues: [createFileIssue({ fileName: 'index.ts', kind: 'barrel' })]
    });

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('barrels: 1');
  });

  it('counts clusters correctly', () => {
    const metric = createMetric({
      directoryPath: 'src/clusters/',
      fileFanOut: 20,
      averageRedundancy: 0.25,
      clusters: [
        createCluster({ prefix: 'report', memberCount: 8, confidence: 'prefix+imports' }),
        createCluster({ prefix: 'example', memberCount: 7, confidence: 'prefix-only' })
      ]
    });

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('clusters: 2');
  });

  it('includes fileIssues in output', () => {
    const metric = createMetric({
      directoryPath: 'src/test/',
      fileIssues: [createFileIssue({ kind: 'low-info-banned' })]
    });

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('low-info: 1');
  });

  it('returns exactly one line per metric', () => {
    const metric = createMetric({
      directoryPath: 'src/test/',
      fileFanOut: 15,
      folderFanOut: 3,
      averageRedundancy: 0.2,
      clusters: [createCluster({ prefix: 'report', memberCount: 5, confidence: 'prefix+imports' })]
    });

    const lines = summaryLines(metric);
    expect(lines).toHaveLength(1);
  });

  it('counts multiple file issue types separately', () => {
    const metric = createMetric({
      directoryPath: 'src/test/',
      fileIssues: [
        createFileIssue({ fileName: 'utils.ts', kind: 'low-info-banned' }),
        createFileIssue({ fileName: 'helpers.ts', kind: 'low-info-discouraged' }),
        createFileIssue({ fileName: 'index.ts', kind: 'barrel' })
      ]
    });

    const line = summaryLines(metric)[0];
    expect(line).toContain('low-info: 2');
    expect(line).toContain('barrels: 1');
  });

  it('handles empty clusters and issues arrays', () => {
    const metric = createMetric({
      directoryPath: 'src/clean/',
      fileFanOut: 3,
      folderFanOut: 0,
      depth: 1,
      averageRedundancy: 0.01
    });

    const line = summaryLines(metric)[0];
    expect(line).toContain('clusters: 0');
    expect(line).toContain('low-info: 0');
    expect(line).toContain('barrels: 0');
  });

  it('produces valid summary line string starting with directory path', () => {
    const metric = createMetric({
      directoryPath: 'src/test/'
    });

    const line = summaryLines(metric)[0];
    expect(line.startsWith('src/test/')).toBe(true);
  });
});
