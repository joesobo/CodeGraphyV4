import { describe, expect, it, vi } from 'vitest';
import { reportOrganize } from '../../../src/organize/report/organize';
import type { OrganizeDirectoryMetric } from '../../../src/organize/organizeTypes';

describe('reportOrganize', () => {
  it('prints message when no metrics', () => {
    const spy = vi.spyOn(console, 'log');
    reportOrganize([]);
    expect(spy).toHaveBeenCalledWith('No directories found for organize analysis.');
    spy.mockRestore();
  });

  it('shows all directories in verbose mode', () => {
    const spy = vi.spyOn(console, 'log');
    const metrics: OrganizeDirectoryMetric[] = [
      {
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
      }
    ];

    reportOrganize(metrics, { verbose: true });

    const calls = spy.mock.calls;
    const loggedText = calls.map((call) => call[0]).join('\n');

    expect(loggedText).toContain('src/stable/');
    expect(loggedText).toContain('[STABLE]');

    spy.mockRestore();
  });

  it('hides STABLE directories in non-verbose mode', () => {
    const spy = vi.spyOn(console, 'log');
    const metrics: OrganizeDirectoryMetric[] = [
      {
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
      }
    ];

    reportOrganize(metrics, { verbose: false });

    expect(spy).toHaveBeenCalledWith('No directories found for organize analysis.');

    spy.mockRestore();
  });

  it('shows directories with SPLIT verdict even in non-verbose mode', () => {
    const spy = vi.spyOn(console, 'log');
    const metrics: OrganizeDirectoryMetric[] = [
      {
        directoryPath: 'src/split/',
        fileFanOut: 50,
        folderFanOut: 2,
        depth: 3,
        averageRedundancy: 0.25,
        clusters: [],
        fileIssues: [],
        fileFanOutVerdict: 'SPLIT',
        folderFanOutVerdict: 'STABLE',
        depthVerdict: 'STABLE'
      }
    ];

    reportOrganize(metrics, { verbose: false });

    const calls = spy.mock.calls;
    const loggedText = calls.map((call) => call[0]).join('\n');

    expect(loggedText).toContain('src/split/');
    expect(loggedText).toContain('[SPLIT]');

    spy.mockRestore();
  });

  it('shows directories with WARNING verdict even in non-verbose mode', () => {
    const spy = vi.spyOn(console, 'log');
    const metrics: OrganizeDirectoryMetric[] = [
      {
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
      }
    ];

    reportOrganize(metrics, { verbose: false });

    const calls = spy.mock.calls;
    const loggedText = calls.map((call) => call[0]).join('\n');

    expect(loggedText).toContain('src/warn/');
    expect(loggedText).toContain('[WARNING]');

    spy.mockRestore();
  });

  it('shows directories with clusters even in non-verbose mode', () => {
    const spy = vi.spyOn(console, 'log');
    const metrics: OrganizeDirectoryMetric[] = [
      {
        directoryPath: 'src/clusters/',
        fileFanOut: 10,
        folderFanOut: 1,
        depth: 2,
        averageRedundancy: 0.1,
        clusters: [
          {
            prefix: 'test',
            memberCount: 5,
            members: [],
            suggestedFolder: 'src/clusters/test/',
            confidence: 'prefix+imports'
          }
        ],
        fileIssues: [],
        fileFanOutVerdict: 'STABLE',
        folderFanOutVerdict: 'STABLE',
        depthVerdict: 'STABLE'
      }
    ];

    reportOrganize(metrics, { verbose: false });

    const calls = spy.mock.calls;
    const loggedText = calls.map((call) => call[0]).join('\n');

    expect(loggedText).toContain('src/clusters/');
    expect(loggedText).toContain('Clusters:');

    spy.mockRestore();
  });

  it('shows directories with file issues even in non-verbose mode', () => {
    const spy = vi.spyOn(console, 'log');
    const metrics: OrganizeDirectoryMetric[] = [
      {
        directoryPath: 'src/issues/',
        fileFanOut: 10,
        folderFanOut: 1,
        depth: 2,
        averageRedundancy: 0.1,
        clusters: [],
        fileIssues: [{ fileName: 'utils.ts', kind: 'low-info-banned', detail: 'catch-all', redundancyScore: undefined }],
        fileFanOutVerdict: 'STABLE',
        folderFanOutVerdict: 'STABLE',
        depthVerdict: 'STABLE'
      }
    ];

    reportOrganize(metrics, { verbose: false });

    const calls = spy.mock.calls;
    const loggedText = calls.map((call) => call[0]).join('\n');

    expect(loggedText).toContain('src/issues/');
    expect(loggedText).toContain('Low-info:');

    spy.mockRestore();
  });

  it('outputs blank line separator between directories', () => {
    const spy = vi.spyOn(console, 'log');
    const metrics: OrganizeDirectoryMetric[] = [
      {
        directoryPath: 'src/dir1/',
        fileFanOut: 50,
        folderFanOut: 2,
        depth: 3,
        averageRedundancy: 0.25,
        clusters: [],
        fileIssues: [],
        fileFanOutVerdict: 'SPLIT',
        folderFanOutVerdict: 'STABLE',
        depthVerdict: 'STABLE'
      },
      {
        directoryPath: 'src/dir2/',
        fileFanOut: 40,
        folderFanOut: 1,
        depth: 2,
        averageRedundancy: 0.2,
        clusters: [],
        fileIssues: [],
        fileFanOutVerdict: 'SPLIT',
        folderFanOutVerdict: 'STABLE',
        depthVerdict: 'STABLE'
      }
    ];

    reportOrganize(metrics);

    const calls = spy.mock.calls;
    expect(calls.length).toBeGreaterThan(2);

    // Find blank line between directories
    let blankLineFound = false;
    for (let i = 1; i < calls.length - 1; i++) {
      if (calls[i][0] === '') {
        blankLineFound = true;
        break;
      }
    }

    expect(blankLineFound).toBe(true);

    spy.mockRestore();
  });

  it('filters out all-STABLE directories with no issues in non-verbose mode', () => {
    const spy = vi.spyOn(console, 'log');
    const metrics: OrganizeDirectoryMetric[] = [
      {
        directoryPath: 'src/stable1/',
        fileFanOut: 5,
        folderFanOut: 1,
        depth: 2,
        averageRedundancy: 0.05,
        clusters: [],
        fileIssues: [],
        fileFanOutVerdict: 'STABLE',
        folderFanOutVerdict: 'STABLE',
        depthVerdict: 'STABLE'
      },
      {
        directoryPath: 'src/stable2/',
        fileFanOut: 6,
        folderFanOut: 1,
        depth: 2,
        averageRedundancy: 0.06,
        clusters: [],
        fileIssues: [],
        fileFanOutVerdict: 'STABLE',
        folderFanOutVerdict: 'STABLE',
        depthVerdict: 'STABLE'
      }
    ];

    reportOrganize(metrics, { verbose: false });

    expect(spy).toHaveBeenCalledWith('No directories found for organize analysis.');

    spy.mockRestore();
  });

  it('handles mixed directories showing some and filtering others', () => {
    const spy = vi.spyOn(console, 'log');
    const metrics: OrganizeDirectoryMetric[] = [
      {
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
      },
      {
        directoryPath: 'src/split/',
        fileFanOut: 50,
        folderFanOut: 2,
        depth: 3,
        averageRedundancy: 0.25,
        clusters: [],
        fileIssues: [],
        fileFanOutVerdict: 'SPLIT',
        folderFanOutVerdict: 'STABLE',
        depthVerdict: 'STABLE'
      }
    ];

    reportOrganize(metrics, { verbose: false });

    const calls = spy.mock.calls;
    const loggedText = calls.map((call) => call[0]).join('\n');

    expect(loggedText).not.toContain('src/stable/');
    expect(loggedText).toContain('src/split/');

    spy.mockRestore();
  });
});
