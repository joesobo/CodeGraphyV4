import { describe, expect, it } from 'vitest';
import { createCoverageProfiles } from '../../../src/crap/coverage/profiles';

describe('createCoverageProfiles', () => {
  it('uses the package-local profile for quality-tools', () => {
    const profiles = createCoverageProfiles('/repo', 'quality-tools');
    expect(profiles).toEqual([
      {
        args: ['--filter', '@codegraphy-dev/quality-tools', 'exec', 'vitest', 'run', '--config', 'vitest.config.ts', '--coverage'],
        command: 'pnpm',
        coveragePath: '/repo/coverage/quality-tools/coverage-final.json',
        cwd: '/repo'
      }
    ]);
  });

  it('uses extension coverage for the extension package', () => {
    const profiles = createCoverageProfiles('/repo', 'extension');
    expect(profiles).toEqual([
      {
        args: ['--filter', '@codegraphy-dev/extension', 'exec', 'vitest', 'run', '--config', 'vitest.config.ts', '--coverage'],
        command: 'pnpm',
        coveragePath: '/repo/coverage/coverage-final.json',
        cwd: '/repo'
      }
    ]);
  });

  it('uses workspace-scoped coverage for other packages', () => {
    const profiles = createCoverageProfiles('/repo', 'plugin-godot');
    expect(profiles).toEqual([
      {
        args: ['--filter', '@codegraphy-dev/extension', 'exec', 'vitest', 'run', '--config', 'vitest.config.ts', '--coverage'],
        command: 'pnpm',
        coveragePath: '/repo/coverage/coverage-final.json',
        cwd: '/repo',
        env: {
          CODEGRAPHY_VITEST_INCLUDE_JSON: JSON.stringify([
            'packages/plugin-godot/tests/**/*.test.ts',
            'packages/plugin-godot/tests/**/*.test.tsx'
          ]),
          CODEGRAPHY_VITEST_SCOPE: 'workspace'
        }
      }
    ]);
  });

  it('includes both profiles for repo-wide runs', () => {
    const profiles = createCoverageProfiles('/repo');
    expect(profiles).toHaveLength(2);
  });
});
