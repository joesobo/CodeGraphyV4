import { describe, expect, it } from 'vitest';
import { summaryLines } from '../../../src/organize/report/summary';
import type { OrganizeDirectoryMetric } from '../../../src/organize/organizeTypes';

describe('summaryLines', () => {
  it('formats basic summary line correctly', () => {
    const metric: OrganizeDirectoryMetric = {
      directoryPath: 'src/scrap/',
      fileFanOut: 42,
      folderFanOut: 2,
      depth: 3,
      averageRedundancy: 0.31,
      clusters: [],
      fileIssues: [],
      fileFanOutVerdict: 'STABLE',
      folderFanOutVerdict: 'STABLE',
      depthVerdict: 'STABLE'
    };

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
    const metric: OrganizeDirectoryMetric = {
      directoryPath: 'src/test/',
      fileFanOut: 50,
      folderFanOut: 3,
      depth: 2,
      averageRedundancy: 0.2,
      clusters: [],
      fileIssues: [],
      fileFanOutVerdict: 'SPLIT',
      folderFanOutVerdict: 'STABLE',
      depthVerdict: 'STABLE'
    };

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('[SPLIT]');
  });

  it('selects SPLIT verdict when depthVerdict is DEEP', () => {
    const metric: OrganizeDirectoryMetric = {
      directoryPath: 'src/deep/',
      fileFanOut: 10,
      folderFanOut: 2,
      depth: 8,
      averageRedundancy: 0.15,
      clusters: [],
      fileIssues: [],
      fileFanOutVerdict: 'STABLE',
      folderFanOutVerdict: 'STABLE',
      depthVerdict: 'DEEP'
    };

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('[SPLIT]');
  });

  it('selects WARNING verdict when any single verdict is WARNING (not SPLIT)', () => {
    const metric: OrganizeDirectoryMetric = {
      directoryPath: 'src/warn/',
      fileFanOut: 10,
      folderFanOut: 2,
      depth: 3,
      averageRedundancy: 0.1,
      clusters: [],
      fileIssues: [],
      fileFanOutVerdict: 'WARNING',
      folderFanOutVerdict: 'STABLE',
      depthVerdict: 'STABLE'
    };

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('[WARNING]');
  });

  it('prioritizes SPLIT over WARNING', () => {
    const metric: OrganizeDirectoryMetric = {
      directoryPath: 'src/mixed/',
      fileFanOut: 50,
      folderFanOut: 2,
      depth: 3,
      averageRedundancy: 0.1,
      clusters: [],
      fileIssues: [],
      fileFanOutVerdict: 'SPLIT',
      folderFanOutVerdict: 'WARNING',
      depthVerdict: 'STABLE'
    };

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('[SPLIT]');
  });

  it('formats redundancy to exactly 2 decimal places', () => {
    const metric: OrganizeDirectoryMetric = {
      directoryPath: 'src/test/',
      fileFanOut: 10,
      folderFanOut: 1,
      depth: 2,
      averageRedundancy: 0.156789,
      clusters: [],
      fileIssues: [],
      fileFanOutVerdict: 'STABLE',
      folderFanOutVerdict: 'STABLE',
      depthVerdict: 'STABLE'
    };

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('redundancy: 0.16');
    expect(lines[0]).not.toContain('redundancy: 0.156');
  });

  it('counts low-info issues correctly', () => {
    const metric: OrganizeDirectoryMetric = {
      directoryPath: 'src/lowinfo/',
      fileFanOut: 10,
      folderFanOut: 1,
      depth: 2,
      averageRedundancy: 0.1,
      clusters: [],
      fileIssues: [
        { fileName: 'utils.ts', kind: 'low-info-banned', detail: 'catch-all', redundancyScore: undefined },
        { fileName: 'helpers.ts', kind: 'low-info-discouraged', detail: 'generic', redundancyScore: undefined }
      ],
      fileFanOutVerdict: 'STABLE',
      folderFanOutVerdict: 'STABLE',
      depthVerdict: 'STABLE'
    };

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('low-info: 2');
  });

  it('counts barrel issues correctly', () => {
    const metric: OrganizeDirectoryMetric = {
      directoryPath: 'src/barrels/',
      fileFanOut: 10,
      folderFanOut: 1,
      depth: 2,
      averageRedundancy: 0.1,
      clusters: [],
      fileIssues: [
        { fileName: 'index.ts', kind: 'barrel', detail: '5 of 6 exports', redundancyScore: undefined }
      ],
      fileFanOutVerdict: 'STABLE',
      folderFanOutVerdict: 'STABLE',
      depthVerdict: 'STABLE'
    };

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('barrels: 1');
  });

  it('counts clusters correctly', () => {
    const metric: OrganizeDirectoryMetric = {
      directoryPath: 'src/clusters/',
      fileFanOut: 20,
      folderFanOut: 1,
      depth: 2,
      averageRedundancy: 0.25,
      clusters: [
        {
          prefix: 'report',
          memberCount: 8,
          members: [],
          suggestedFolder: 'src/clusters/report/',
          confidence: 'prefix+imports'
        },
        {
          prefix: 'example',
          memberCount: 7,
          members: [],
          suggestedFolder: 'src/clusters/example/',
          confidence: 'prefix-only'
        }
      ],
      fileIssues: [],
      fileFanOutVerdict: 'STABLE',
      folderFanOutVerdict: 'STABLE',
      depthVerdict: 'STABLE'
    };

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('clusters: 2');
  });

  it('handles all STABLE verdicts', () => {
    const metric: OrganizeDirectoryMetric = {
      directoryPath: 'src/stable/',
      fileFanOut: 5,
      folderFanOut: 1,
      depth: 2,
      averageRedundancy: 0.05,
      clusters: [],
      fileIssues: [],
      fileFanOutVerdict: 'STABLE',
      folderFanOutVerdict: 'STABLE',
      depthVerdict: 'STABLE'
    };

    const lines = summaryLines(metric);
    expect(lines[0]).toContain('[STABLE]');
  });
});
