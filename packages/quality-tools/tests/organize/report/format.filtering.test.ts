import { describe, expect, it, vi } from 'vitest';
import { reportOrganize } from '../../../src/organize/report/format';
import { createMetric, createCluster, createFileIssue } from '../testHelpers';

describe('reportOrganize - filtering', () => {
  it('prints message when no metrics', () => {
    const spy = vi.spyOn(console, 'log');
    reportOrganize([]);
    expect(spy).toHaveBeenCalledWith('No directories found for organize analysis.');
    spy.mockRestore();
  });

  it('shows all directories in verbose mode', () => {
    const spy = vi.spyOn(console, 'log');
    const metrics = [createMetric({ directoryPath: 'src/stable/' })];

    reportOrganize(metrics, { verbose: true });

    const calls = spy.mock.calls;
    const loggedText = calls.map((call) => call[0]).join('\n');

    expect(loggedText).toContain('src/stable/');
    expect(loggedText).toContain('[STABLE]');

    spy.mockRestore();
  });

  it('hides STABLE directories in non-verbose mode', () => {
    const spy = vi.spyOn(console, 'log');
    const metrics = [createMetric({ directoryPath: 'src/stable/' })];

    reportOrganize(metrics, { verbose: false });

    expect(spy).toHaveBeenCalledWith('No directories found for organize analysis.');

    spy.mockRestore();
  });

  it('shows directories with SPLIT verdict even in non-verbose mode', () => {
    const spy = vi.spyOn(console, 'log');
    const metrics = [
      createMetric({
        directoryPath: 'src/split/',
        fileFanOut: 50,
        averageRedundancy: 0.25,
        fileFanOutVerdict: 'SPLIT' as const
      })
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
    const metrics = [
      createMetric({
        directoryPath: 'src/warn/',
        fileFanOutVerdict: 'WARNING' as const
      })
    ];

    reportOrganize(metrics, { verbose: false });

    const calls = spy.mock.calls;
    const loggedText = calls.map((call) => call[0]).join('\n');

    expect(loggedText).toContain('src/warn/');
    expect(loggedText).toContain('[WARNING]');

    spy.mockRestore();
  });

  it('hides stable directories with only clusters in non-verbose mode', () => {
    const spy = vi.spyOn(console, 'log');
    const metrics = [
      createMetric({
        directoryPath: 'src/clusters/',
        clusters: [createCluster({ confidence: 'prefix+imports' })]
      })
    ];

    reportOrganize(metrics, { verbose: false });

    expect(spy).toHaveBeenCalledWith('No directories found for organize analysis.');

    spy.mockRestore();
  });

  it('shows directories with file issues even in non-verbose mode', () => {
    const spy = vi.spyOn(console, 'log');
    const metrics = [
      createMetric({
        directoryPath: 'src/issues/',
        fileIssues: [createFileIssue({ fileName: 'utils.ts', kind: 'low-info-banned' })]
      })
    ];

    reportOrganize(metrics, { verbose: false });

    const calls = spy.mock.calls;
    const loggedText = calls.map((call) => call[0]).join('\n');

    expect(loggedText).toContain('src/issues/');
    expect(loggedText).toContain('Low-info:');

    spy.mockRestore();
  });

  it('filters out all-STABLE directories with no issues in non-verbose mode', () => {
    const spy = vi.spyOn(console, 'log');
    const metrics = [
      createMetric({ directoryPath: 'src/stable1/', fileFanOut: 5, averageRedundancy: 0.05 }),
      createMetric({ directoryPath: 'src/stable2/', fileFanOut: 6, averageRedundancy: 0.06 })
    ];

    reportOrganize(metrics, { verbose: false });

    expect(spy).toHaveBeenCalledWith('No directories found for organize analysis.');

    spy.mockRestore();
  });

  it('handles mixed directories showing some and filtering others', () => {
    const spy = vi.spyOn(console, 'log');
    const metrics = [
      createMetric({ directoryPath: 'src/stable/', fileFanOut: 5 }),
      createMetric({
        directoryPath: 'src/split/',
        fileFanOut: 50,
        averageRedundancy: 0.25,
        fileFanOutVerdict: 'SPLIT' as const
      })
    ];

    reportOrganize(metrics, { verbose: false });

    const calls = spy.mock.calls;
    const loggedText = calls.map((call) => call[0]).join('\n');

    expect(loggedText).not.toContain('src/stable/');
    expect(loggedText).toContain('src/split/');

    spy.mockRestore();
  });

  it('shows directory with DEEP verdict converted to SPLIT', () => {
    const spy = vi.spyOn(console, 'log');
    const metrics = [
      createMetric({
        directoryPath: 'src/deepdir/',
        depth: 10,
        depthVerdict: 'DEEP' as const
      })
    ];

    reportOrganize(metrics, { verbose: false });

    const calls = spy.mock.calls;
    const loggedText = calls.map((call) => call[0]).join('\n');

    expect(loggedText).toContain('src/deepdir/');

    spy.mockRestore();
  });
});
