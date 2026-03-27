import { describe, expect, it } from 'vitest';
import { runScrapCli } from '../../src/scrap/runScrapCli';
import { REPO_ROOT } from '../../src/shared/repoRoot';
import { createDependencies, createMetrics } from './runScrapCli.testSupport';

describe('runScrapCli report output', () => {
  it('reports human-readable output by default', () => {
    const dependencies = createDependencies();
    runScrapCli(['quality-tools/'], dependencies);

    expect(dependencies.reportScrap).toHaveBeenCalledWith(createMetrics(), REPO_ROOT, {
      verbose: false
    });
  });
});
