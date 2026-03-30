import { describe, expect, it } from 'vitest';
import {
  extensionCoverageProfile,
  qualityToolsCoverageProfile
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
});
