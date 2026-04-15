import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'module';
import {
  discoverMutationPackageNames,
  resolveMutationProfile
} from '../../../src/mutation/analysis/profile';
import { REPO_ROOT } from '../../../src/shared/resolve/repoRoot';
import { resolveQualityTarget } from '../../../src/shared/resolve/target';

const require = createRequire(import.meta.url);
const rootStrykerConfig = require(`${REPO_ROOT}/stryker.config.cjs`) as {
  dryRunTimeoutMinutes?: number;
  plugins?: string[];
  testRunner?: string;
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

  it('uses the shared root config for extension and generic workspace packages', () => {
    expect(resolveMutationProfile(resolveQualityTarget(REPO_ROOT, 'extension/'))).toMatchObject({
      configPath: 'stryker.config.cjs'
    });

    expect(resolveMutationProfile(resolveQualityTarget(REPO_ROOT, 'quality-tools/'))).toMatchObject({
      configPath: 'packages/quality-tools/stryker.config.json'
    });
  });

  it('raises the shared dry-run timeout above the stryker default', () => {
    expect(rootStrykerConfig).toMatchObject({
      dryRunTimeoutMinutes: expect.any(Number),
    });
    expect(rootStrykerConfig.dryRunTimeoutMinutes).toBeGreaterThanOrEqual(30);
  });

  it('routes shared mutation through the repo-local vitest runner', () => {
    expect(rootStrykerConfig.testRunner).toBe('codegraphy-vitest');
    expect(rootStrykerConfig.plugins).toContain('./packages/quality-tools/stryker/codegraphy-vitest-runner.mjs');
  });

  it('scopes extension mutation test discovery to extension tests', async () => {
    const { resolveMutationVitestIncludes } = await import('../../../../extension/vitest.includes');

    expect(resolveMutationVitestIncludes({})).toEqual([
      'packages/extension/tests/**/*.test.{ts,tsx}',
    ]);
  });

  it('scopes shared mutation test discovery to workspace tests when requested', async () => {
    const { resolveMutationVitestIncludes } = await import('../../../../extension/vitest.includes');

    expect(resolveMutationVitestIncludes({
      CODEGRAPHY_VITEST_SCOPE: 'workspace',
    })).toEqual([
      'packages/*/tests/**/*.test.{ts,tsx}',
    ]);
  });

  it('scopes regular extension vitest discovery to extension-owned tests', async () => {
    const { resolveMutationVitestIncludes } = await import('../../../../extension/vitest.includes');

    expect(resolveMutationVitestIncludes({})).toEqual([
      'packages/extension/tests/**/*.test.{ts,tsx}',
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
