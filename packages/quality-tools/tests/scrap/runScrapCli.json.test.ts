import { describe, expect, it, vi } from 'vitest';
import { runScrapCli } from '../../src/scrap/runScrapCli';
import { REPO_ROOT } from '../../src/shared/repoRoot';
import { createDependencies, createMetrics } from './runScrapCli.testSupport';

describe('runScrapCli json output', () => {
  it('prints json output when requested', () => {
    const dependencies = createDependencies();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    runScrapCli(['--json', 'quality-tools/'], dependencies);

    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(REPO_ROOT, 'quality-tools/');
    expect(dependencies.analyzeScrap).toHaveBeenCalled();
    expect(dependencies.reportScrap).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });

  it('sets a failing exit code for strict json output when violations are present', () => {
    const dependencies = createDependencies({
      analyzeScrap: () => [
        {
          ...createMetrics()[0],
          aiActionability: 'MANUAL_SPLIT',
          remediationMode: 'SPLIT'
        }
      ]
    });
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    runScrapCli(['--json', '--strict', 'quality-tools/'], dependencies);

    expect(dependencies.setExitCode).toHaveBeenCalledWith(1);
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });

  it('sets a failing exit code for split policy json output when split files are present', () => {
    const dependencies = createDependencies({
      analyzeScrap: () => [
        {
          ...createMetrics()[0],
          aiActionability: 'MANUAL_SPLIT',
          remediationMode: 'SPLIT'
        }
      ]
    });
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    runScrapCli(['--json', '--policy', 'split', 'quality-tools/'], dependencies);

    expect(dependencies.setExitCode).toHaveBeenCalledWith(1);
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });
});
