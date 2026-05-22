import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../../../src/shared/resolve/repoRoot';

const mutationSeedWorkflow = readFileSync(`${REPO_ROOT}/.github/workflows/mutation-seed.yml`, 'utf-8');

describe('mutation seed workflow', () => {
  it('keeps package mutation at the GitHub-hosted runner maximum', () => {
    expect(mutationSeedWorkflow).toMatch(/GitHub-hosted runners cap job execution at 6h/);
    expect(mutationSeedWorkflow).toMatch(/seed-package:[\s\S]*timeout-minutes:\s*360/);
  });

  it('discovers seed jobs and uploads shard-specific artifacts before assembling one seed', () => {
    expect(mutationSeedWorkflow).toMatch(/listMutationSeedJobs\.ts --json/);
    expect(mutationSeedWorkflow).toMatch(/matrix:\s*\n\s*include:\s*\$\{\{ fromJson\(needs\.discover-seed-jobs\.outputs\.jobs\) \}\}/);
    expect(mutationSeedWorkflow).toMatch(/mutation-seed-\$\{\{ matrix\.package \}\}-\$\{\{ matrix\.shard \}\}/);
    expect(mutationSeedWorkflow).toMatch(/assembleMutationSeed\.ts/);
    expect(mutationSeedWorkflow).toMatch(/name:\s*main-mutation-seed/);
  });
});
