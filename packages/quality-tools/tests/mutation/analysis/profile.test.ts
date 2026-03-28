import { describe, expect, it } from 'vitest';
import {
  discoverMutationPackageNames,
  resolveMutationProfile
} from '../../../src/mutation/analysis/profile';
import { REPO_ROOT } from '../../../src/shared/resolve/repoRoot';
import { resolveQualityTarget } from '../../../src/shared/resolve/target';

describe('mutation profiles', () => {
  it('discovers supported mutation packages including quality-tools', () => {
    const packages = discoverMutationPackageNames(REPO_ROOT);
    expect(packages).toContain('extension');
    expect(packages).toContain('quality-tools');
    expect(packages).not.toContain('plugin-api');
  });

  it('uses package-specific configs for extension and quality-tools', () => {
    expect(resolveMutationProfile(resolveQualityTarget(REPO_ROOT, 'extension/'))).toMatchObject({
      configPath: 'packages/extension/stryker.config.json'
    });

    expect(resolveMutationProfile(resolveQualityTarget(REPO_ROOT, 'quality-tools/'))).toMatchObject({
      configPath: 'packages/quality-tools/stryker.config.json'
    });
  });

  it('scopes extension mutation test discovery to extension tests', async () => {
    const { default: config } = await import('../../../../extension/vitest.stryker.config');

    expect(config.test?.include).toEqual([
      'packages/extension/tests/**/*.test.{ts,tsx}',
      'packages/extension/__tests__/**/*.test.{ts,tsx}',
    ]);
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
