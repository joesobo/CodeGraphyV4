import { join } from 'path';
import { type CoverageProfile } from './profiles';

function createProfile(
  repoRoot: string,
  filterName: string,
  coveragePath: string
): CoverageProfile {
  return {
    coveragePath,
    cwd: repoRoot,
    args: ['--filter', filterName, 'exec', 'vitest', 'run', '--config', 'vitest.config.ts', '--coverage'],
    command: 'pnpm'
  };
}

export function extensionCoverageProfile(repoRoot: string): CoverageProfile {
  return createProfile(
    repoRoot,
    '@codegraphy/extension',
    join(repoRoot, 'coverage/coverage-final.json')
  );
}

export function qualityToolsCoverageProfile(repoRoot: string): CoverageProfile {
  return createProfile(
    repoRoot,
    '@codegraphy/quality-tools',
    join(repoRoot, 'coverage/quality-tools/coverage-final.json')
  );
}

export function workspacePackageCoverageProfile(
  repoRoot: string,
  packageName: string
): CoverageProfile {
  return {
    coveragePath: join(repoRoot, 'coverage/coverage-final.json'),
    cwd: repoRoot,
    env: {
      CODEGRAPHY_VITEST_INCLUDE_JSON: JSON.stringify([
        `packages/${packageName}/tests/**/*.test.ts`,
        `packages/${packageName}/tests/**/*.test.tsx`
      ]),
      CODEGRAPHY_VITEST_SCOPE: 'workspace'
    },
    args: ['--filter', '@codegraphy/extension', 'exec', 'vitest', 'run', '--config', 'vitest.config.ts', '--coverage'],
    command: 'pnpm'
  };
}
