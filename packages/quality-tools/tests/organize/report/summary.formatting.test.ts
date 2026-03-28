import { describe, expect, it } from 'vitest';
import { summaryLines } from '../../../src/organize/report/summary';
import { createMetric, createCluster, createFileIssue } from '../testHelpers';

describe('summaryLines - formatting and verdicts', () => {
  it('formats basic summary line correctly', () => {
    const metric = createMetric({
      directoryPath: 'src/scrap/',
      fileFanOut: 42,
      folderFanOut: 2,
      depth: 3,
      averageRedundancy: 0.31
    });

    const lines = summaryLines(metric);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('src/scrap/');
    expect(lines[0]).toContain('[STABLE]');
    expect(lines[0]).toContain('files: 42');
    expect(lines[0]).toContain('folders: 2');
    expect(lines[0]).toContain('depth: 3');
    expect(lines[0]).toContain('redundancy: 0.31');
    expect(lines[0]).toContain('clusters: 0');
    expect(lines[0]).toContain('low-info: 0');
    expect(lines[0]).toContain('barrels: 0');
  });

  it('selects SPLIT verdict when fileFanOutVerdict is SPLIT', () => {
    const metric = createMetric({
      directoryPath: 'src/test/',
      fileFanOut: 50,
      fileFanOutVerdict: 'SPLIT' as const
    });

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('[SPLIT]');
  });

  it('selects SPLIT verdict when depthVerdict is DEEP', () => {
    const metric = createMetric({
      directoryPath: 'src/deep/',
      depth: 8,
      depthVerdict: 'DEEP' as const
    });

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('[SPLIT]');
  });

  it('selects WARNING verdict when any single verdict is WARNING (not SPLIT)', () => {
    const metric = createMetric({
      directoryPath: 'src/warn/',
      fileFanOutVerdict: 'WARNING' as const
    });

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('[WARNING]');
  });

  it('prioritizes SPLIT over WARNING', () => {
    const metric = createMetric({
      directoryPath: 'src/mixed/',
      fileFanOut: 50,
      fileFanOutVerdict: 'SPLIT' as const,
      folderFanOutVerdict: 'WARNING' as const
    });

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('[SPLIT]');
  });

  it('formats redundancy to exactly 2 decimal places', () => {
    const metric = createMetric({
      directoryPath: 'src/test/',
      averageRedundancy: 0.156789
    });

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('redundancy: 0.16');
    expect(lines[0]).not.toContain('redundancy: 0.156');
  });

  it('handles all STABLE verdicts', () => {
    const metric = createMetric({
      directoryPath: 'src/stable/',
      fileFanOut: 5,
      averageRedundancy: 0.05
    });

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('[STABLE]');
  });

  it('formats zero redundancy correctly', () => {
    const metric = createMetric({
      directoryPath: 'src/test/',
      averageRedundancy: 0
    });

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('redundancy: 0.00');
  });

  it('formats high redundancy correctly', () => {
    const metric = createMetric({
      directoryPath: 'src/test/',
      fileFanOut: 20,
      folderFanOut: 2,
      depth: 3,
      averageRedundancy: 0.999999,
      fileFanOutVerdict: 'STABLE' as const,
      folderFanOutVerdict: 'STABLE' as const,
      depthVerdict: 'STABLE' as const
    });

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('redundancy: 1.00');
  });

  it('includes all required fields in output string', () => {
    const metric = createMetric({
      directoryPath: 'src/example/',
      fileFanOut: 12,
      folderFanOut: 2,
      depth: 3,
      averageRedundancy: 0.25,
      clusters: [createCluster({ prefix: 'test', memberCount: 3, confidence: 'prefix-only' })],
      fileIssues: [createFileIssue({ fileName: 'helpers.ts', kind: 'low-info-banned', detail: 'banned name' })],
      fileFanOutVerdict: 'WARNING' as const
    });

    const line = summaryLines(metric)[0];

    expect(line).toContain('src/example/');
    expect(line).toContain('[WARNING]');
    expect(line).toContain('files: 12');
    expect(line).toContain('folders: 2');
    expect(line).toContain('depth: 3');
    expect(line).toContain('redundancy: 0.25');
    expect(line).toContain('clusters: 1');
    expect(line).toContain('low-info: 1');
    expect(line).toContain('barrels: 0');
  });
});
