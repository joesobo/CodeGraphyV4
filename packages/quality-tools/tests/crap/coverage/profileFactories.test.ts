import { describe, expect, it } from 'vitest';
import {
  extensionCoverageProfile,
  qualityToolsCoverageProfile,
  workspacePackageCoverageProfile
} from '../../../src/crap/coverage/factories';

describe('coverageProfileFactories', () => {
  it('builds the extension workspace profile', () => {
    expect(extensionCoverageProfile('/repo')).toEqual({
      args: ['--filter', '@codegraphy/extension', 'exec', 'vitest', 'run', '--config', 'vitest.config.ts', '--coverage'],
      command: 'pnpm',
      coveragePath: '/repo/coverage/coverage-final.json',
      cwd: '/repo'
    });
  });

  it('builds the quality-tools package profile', () => {
    expect(qualityToolsCoverageProfile('/repo')).toEqual({
      args: ['--filter', '@codegraphy/quality-tools', 'exec', 'vitest', 'run', '--config', 'vitest.config.ts', '--coverage'],
      command: 'pnpm',
      coveragePath: '/repo/coverage/quality-tools/coverage-final.json',
      cwd: '/repo'
    });
  });

  it('builds a workspace-scoped package profile through the extension Vitest harness', () => {
    expect(workspacePackageCoverageProfile('/repo', 'plugin-godot')).toEqual({
      args: ['--filter', '@codegraphy/extension', 'exec', 'vitest', 'run', '--config', 'vitest.config.ts', '--coverage'],
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
    });
  });
});
