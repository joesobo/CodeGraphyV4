import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { reportOrganize } from '../../../src/organize/report/format';
import { createMetric, createCluster, createFileIssue } from '../testHelpers';

describe('reportOrganize - display', () => {
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spy = vi.spyOn(console, 'log');
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('outputs blank line separator between directories', () => {
    const metrics = [
      createMetric({
        directoryPath: 'src/dir1/',
        fileFanOut: 50,
        folderFanOut: 2,
        depth: 3,
        averageRedundancy: 0.25,
        fileFanOutVerdict: 'SPLIT' as const
      }),
      createMetric({
        directoryPath: 'src/dir2/',
        fileFanOut: 40,
        folderFanOut: 1,
        depth: 2,
        averageRedundancy: 0.2,
        fileFanOutVerdict: 'SPLIT' as const
      })
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
    expect(spy).toHaveBeenCalled();
  });

  it('shows all directories when verbose is true and no filtering occurs', () => {
    const metrics = [
      createMetric({ directoryPath: 'src/dir1/', fileFanOut: 2, averageRedundancy: 0.02 }),
      createMetric({ directoryPath: 'src/dir2/', fileFanOut: 3, averageRedundancy: 0.03 })
    ];

    reportOrganize(metrics, { verbose: true });

    const calls = spy.mock.calls;
    const loggedText = calls.map((call) => call[0]).join('\n');

    expect(loggedText).toContain('src/dir1/');
    expect(loggedText).toContain('src/dir2/');
    expect(spy.mock.calls.length).toBeGreaterThan(2);
  });

  it('respects verbose=true even for all-STABLE directories', () => {
    const metrics = [createMetric({ directoryPath: 'src/stable/', fileFanOut: 3, averageRedundancy: 0.01 })];

    reportOrganize(metrics, { verbose: true });

    const calls = spy.mock.calls;
    const loggedText = calls.map((call) => call[0]).join('\n');

    expect(loggedText).toContain('src/stable/');
    expect(loggedText).not.toContain('No directories found');
    expect(calls.length).toBeGreaterThan(1);
  });

  it('shows directory with WARNING on any single verdict', () => {
    const metrics = [
      createMetric({
        directoryPath: 'src/folderWarning/',
        folderFanOut: 11,
        folderFanOutVerdict: 'WARNING' as const
      })
    ];

    reportOrganize(metrics, { verbose: false });

    const calls = spy.mock.calls;
    const loggedText = calls.map((call) => call[0]).join('\n');

    expect(loggedText).toContain('src/folderWarning/');
    expect(loggedText).toContain('WARNING');
  });

  it('hides directory when it only has clusters and stable verdicts', () => {
    const metrics = [
      createMetric({
        directoryPath: 'src/stable/',
        clusters: [createCluster({ prefix: 'test', confidence: 'prefix+imports' })]
      })
    ];

    reportOrganize(metrics, { verbose: false });

    expect(spy).toHaveBeenCalledWith('No directories found for organize analysis.');
  });

  it('shows directory when it has file issues despite STABLE verdicts', () => {
    const metrics = [
      createMetric({
        directoryPath: 'src/stable/',
        fileIssues: [createFileIssue({ fileName: 'utils.ts', kind: 'low-info-banned' })]
      })
    ];

    reportOrganize(metrics, { verbose: false });

    const calls = spy.mock.calls;
    const loggedText = calls.map((call) => call[0]).join('\n');

    expect(loggedText).toContain('src/stable/');
    expect(loggedText).toContain('Low-info:');
    expect(calls.length).toBeGreaterThan(1);
  });

  it('logs exactly message when no metrics are provided', () => {
    reportOrganize([]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('No directories found for organize analysis.');
  });

  it('logs exactly message when all metrics filtered out in non-verbose', () => {
    const metrics = [createMetric({ directoryPath: 'src/stable1/', fileFanOut: 2 })];

    reportOrganize(metrics, { verbose: false });

    const calls = spy.mock.calls;
    expect(calls.some((call) => call[0] === 'No directories found for organize analysis.')).toBe(true);
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  it('defaults to non-verbose when options not provided', () => {
    const metrics = [createMetric({ directoryPath: 'src/stable/', fileFanOut: 3 })];

    reportOrganize(metrics);

    const calls = spy.mock.calls;
    const loggedText = calls.map((call) => call[0]).join('\n');

    expect(loggedText).toContain('No directories found');
    expect(spy).toHaveBeenCalled();
  });
});
