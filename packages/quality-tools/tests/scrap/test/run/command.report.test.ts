import { describe, expect, it } from 'vitest';
import { runScrapCli } from '../../../../src/scrap/command';
import { REPO_ROOT } from '../../../../src/shared/resolve/repoRoot';
import { createDependencies, createMetrics } from './support';

describe('command report output', () => {
  it('reports human-readable output by default', () => {
    const dependencies = createDependencies();
    runScrapCli(['quality-tools/'], dependencies);

    expect(dependencies.reportScrap).toHaveBeenCalledWith(createMetrics(), REPO_ROOT, {
      verbose: false
    });
  });
});
