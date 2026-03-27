import { describe, expect, it, vi } from 'vitest';
import { runScrapCli } from '../../src/scrap/runScrapCli';
import { createDependencies, createMetrics } from './runScrapCli.testSupport';

const { writeScrapBaseline } = vi.hoisted(() => ({
  writeScrapBaseline: vi.fn()
}));

vi.mock('../../src/scrap/writeScrapBaseline', () => ({
  writeScrapBaseline
}));

describe('runScrapCli side effects', () => {
  it('does not write a baseline or fail strict mode when optional flags are absent', () => {
    writeScrapBaseline.mockClear();
    const dependencies = createDependencies();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    runScrapCli(['quality-tools/'], dependencies);

    expect(writeScrapBaseline).not.toHaveBeenCalled();
    expect(dependencies.setExitCode).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('does not fail strict json output when strict mode passes clean metrics', () => {
    writeScrapBaseline.mockClear();
    const dependencies = createDependencies({
      analyzeScrap: () => [
        {
          ...createMetrics()[0],
          aiActionability: 'AUTO_REFACTOR',
          remediationMode: 'LOCAL'
        }
      ]
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    runScrapCli(['--json', '--strict', 'quality-tools/'], dependencies);

    expect(writeScrapBaseline).not.toHaveBeenCalled();
    expect(dependencies.setExitCode).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
    error.mockRestore();
  });

  it('keeps advisory policy non-failing when split files are present', () => {
    writeScrapBaseline.mockClear();
    const dependencies = createDependencies({
      analyzeScrap: () => [
        {
          ...createMetrics()[0],
          aiActionability: 'MANUAL_SPLIT',
          remediationMode: 'SPLIT'
        }
      ]
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    runScrapCli(['--policy', 'advisory', 'quality-tools/'], dependencies);

    expect(writeScrapBaseline).not.toHaveBeenCalled();
    expect(dependencies.setExitCode).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('keeps review policy non-failing when only split files are present', () => {
    writeScrapBaseline.mockClear();
    const dependencies = createDependencies({
      analyzeScrap: () => [
        {
          ...createMetrics()[0],
          aiActionability: 'MANUAL_SPLIT',
          remediationMode: 'SPLIT'
        }
      ]
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    runScrapCli(['--policy', 'review', 'quality-tools/'], dependencies);

    expect(writeScrapBaseline).not.toHaveBeenCalled();
    expect(dependencies.setExitCode).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
