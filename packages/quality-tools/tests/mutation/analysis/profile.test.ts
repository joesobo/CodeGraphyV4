import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'module';
import {
  discoverMutationPackageNames,
  resolveMutationProfile
} from '../../../src/mutation/analysis/profile';
import { REPO_ROOT } from '../../../src/shared/resolve/repoRoot';
import { resolveQualityTarget } from '../../../src/shared/resolve/target';

const require = createRequire(import.meta.url);
const extensionStrykerConfig = require('../../../../extension/stryker.config.cjs') as {
  dryRunTimeoutMinutes?: number;
};

describe('mutation profiles', () => {
  afterEach(() => {
    delete process.env.CODEGRAPHY_VITEST_SCOPE;
    delete process.env.CODEGRAPHY_VITEST_INCLUDE_JSON;
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

  it('raises the extension dry-run timeout above the stryker default', () => {
    expect(extensionStrykerConfig).toMatchObject({
      dryRunTimeoutMinutes: expect.any(Number),
    });
    expect(extensionStrykerConfig.dryRunTimeoutMinutes).toBeGreaterThanOrEqual(30);
  });

  it('scopes extension mutation test discovery to extension tests', async () => {
    const { resolveMutationVitestIncludes } = await import('../../../../extension/vitest.includes');

    expect(resolveMutationVitestIncludes({})).toEqual([
      'packages/extension/tests/**/*.test.{ts,tsx}',
      'packages/extension/__tests__/**/*.test.{ts,tsx}',
    ]);
  });

  it('scopes shared mutation test discovery to workspace tests when requested', async () => {
    const { resolveMutationVitestIncludes } = await import('../../../../extension/vitest.includes');

    expect(resolveMutationVitestIncludes({
      CODEGRAPHY_VITEST_SCOPE: 'workspace',
    })).toEqual([
      'packages/*/tests/**/*.test.{ts,tsx}',
      'packages/*/__tests__/**/*.test.{ts,tsx}',
    ]);
  });

  it('scopes regular extension vitest discovery to extension-owned tests', async () => {
    const { extensionOwnedVitestIncludes } = await import('../../../../extension/vitest.includes');

    expect(extensionOwnedVitestIncludes).toEqual([
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
