import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  discoverMutationPackageNames,
  resolveMutationProfile
} from '../../../src/mutation/analysis/profile';
import { REPO_ROOT } from '../../../src/shared/resolve/repoRoot';
import { resolveQualityTarget } from '../../../src/shared/resolve/target';

describe('mutation profiles', () => {
  afterEach(() => {
    delete process.env.CODEGRAPHY_VITEST_SCOPE;
    vi.resetModules();
  });

  it('discovers supported mutation packages including quality-tools', () => {
    const packages = discoverMutationPackageNames(REPO_ROOT);
    expect(packages).toContain('extension');
    expect(packages).toContain('quality-tools');
    expect(packages).not.toContain('plugin-api');
  });

  it('uses package-specific configs for extension and quality-tools', () => {
    expect(resolveMutationProfile(resolveQualityTarget(REPO_ROOT, 'extension/'))).toMatchObject({
      configPath: 'packages/extension/stryker.config.cjs'
    });

    expect(resolveMutationProfile(resolveQualityTarget(REPO_ROOT, 'quality-tools/'))).toMatchObject({
      configPath: 'packages/quality-tools/stryker.config.json'
    });
  });

  it('scopes extension mutation test discovery to extension tests', async () => {
    vi.resetModules();
    const { default: config } = await import('../../../../extension/vitest.stryker.config');

    expect(config.test?.include).toEqual([
      'packages/extension/tests/**/*.test.{ts,tsx}',
      'packages/extension/__tests__/**/*.test.{ts,tsx}',
    ]);
  });

  it('scopes shared mutation test discovery to workspace tests when requested', async () => {
    process.env.CODEGRAPHY_VITEST_SCOPE = 'workspace';
    vi.resetModules();
    const { default: config } = await import('../../../../extension/vitest.stryker.config');

    expect(config.test?.include).toEqual([
      'packages/*/tests/**/*.test.{ts,tsx}',
      'packages/*/__tests__/**/*.test.{ts,tsx}',
    ]);
  });

  it('scopes regular extension vitest discovery to extension-owned tests', async () => {
    const { default: config } = await import('../../../../extension/vitest.config');

    expect(config.test?.include).toEqual([
      'tests/**/*.test.{ts,tsx}',
    ]);
  });

  it('uses the shared root config for generic workspace packages', () => {
    expect(resolveMutationProfile(resolveQualityTarget(REPO_ROOT, 'plugin-godot/'))).toMatchObject({
      configPath: 'stryker.config.cjs',
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
