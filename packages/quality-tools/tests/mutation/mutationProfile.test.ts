import { describe, expect, it } from 'vitest';
import {
  discoverMutationPackageNames,
  resolveMutationProfile
} from '../../src/mutation/mutationProfile';
import { REPO_ROOT } from '../../src/shared/repoRoot';
import { resolveQualityTarget } from '../../src/shared/resolveTarget';

describe('mutation profiles', () => {
  it('discovers supported mutation packages including quality-tools', () => {
    const packages = discoverMutationPackageNames(REPO_ROOT);
    expect(packages).toContain('extension');
    expect(packages).toContain('quality-tools');
    expect(packages).not.toContain('plugin-api');
  });

  it('uses package-specific configs for extension and quality-tools', () => {
    expect(resolveMutationProfile(resolveQualityTarget(REPO_ROOT, 'extension/'))).toMatchObject({
      configPath: 'stryker.config.json'
    });

    expect(resolveMutationProfile(resolveQualityTarget(REPO_ROOT, 'quality-tools/'))).toMatchObject({
      configPath: 'packages/quality-tools/stryker.config.json'
    });
  });

  it('uses the shared root config for generic workspace packages', () => {
    expect(resolveMutationProfile(resolveQualityTarget(REPO_ROOT, 'plugin-godot/'))).toMatchObject({
      configPath: 'stryker.config.json',
      packageName: 'plugin-godot'
    });
  });

  it('throws when the target does not resolve to a workspace package', () => {
    expect(() => resolveMutationProfile({
      absolutePath: `${REPO_ROOT}/docs`,
      kind: 'directory',
      relativePath: 'docs'
    })).toThrow('Mutation targets must resolve to a workspace package.');
  });
});
