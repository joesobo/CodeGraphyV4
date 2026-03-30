import { describe, expect, it } from 'vitest';
import { createCoverageProfiles } from '../../../src/crap/coverage/profiles';

describe('createCoverageProfiles', () => {
  it('uses the package-local profile for quality-tools', () => {
    const profiles = createCoverageProfiles('/repo', 'quality-tools');
    expect(profiles).toEqual([
      {
        args: ['--filter', '@codegraphy/quality-tools', 'exec', 'vitest', 'run', '--config', 'vitest.config.ts', '--coverage'],
        command: 'pnpm',
        coveragePath: '/repo/coverage/quality-tools/coverage-final.json',
        cwd: '/repo'
      }
    ]);
  });

  it('uses extension coverage for non-quality packages', () => {
    const profiles = createCoverageProfiles('/repo', 'extension');
    expect(profiles).toEqual([
      {
        args: ['--filter', '@codegraphy/extension', 'exec', 'vitest', 'run', '--config', 'vitest.config.ts', '--coverage'],
        command: 'pnpm',
        coveragePath: '/repo/coverage/coverage-final.json',
        cwd: '/repo'
      }
    ]);
  });

  it('includes both profiles for repo-wide runs', () => {
    const profiles = createCoverageProfiles('/repo');
    expect(profiles).toHaveLength(2);
  });
});
