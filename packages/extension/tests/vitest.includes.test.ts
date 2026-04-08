import { afterEach, describe, expect, it } from 'vitest';
import {
  extensionMutationIncludes,
  extensionOwnedVitestIncludes,
  resolveMutationVitestIncludes,
  workspaceMutationIncludes,
} from '../vitest.includes';

describe('vitest includes', () => {
  afterEach(() => {
    delete process.env.CODEGRAPHY_VITEST_SCOPE;
    delete process.env.CODEGRAPHY_VITEST_INCLUDE_JSON;
  });

  it('defaults mutation scope to extension tests', () => {
    expect(resolveMutationVitestIncludes({})).toEqual(extensionMutationIncludes);
  });

  it('switches mutation scope to workspace tests when requested', () => {
    expect(resolveMutationVitestIncludes({
      CODEGRAPHY_VITEST_SCOPE: 'workspace',
    })).toEqual(workspaceMutationIncludes);
  });

  it('prefers explicit mutation include overrides', () => {
    process.env.CODEGRAPHY_VITEST_SCOPE = 'workspace';
    process.env.CODEGRAPHY_VITEST_INCLUDE_JSON = JSON.stringify(['packages/plugin-godot/__tests__/**/*.test.ts']);

    expect(resolveMutationVitestIncludes()).toEqual(['packages/plugin-godot/__tests__/**/*.test.ts']);
  });

  it('exposes the regular extension vitest include list', () => {
    expect(extensionOwnedVitestIncludes).toEqual(['tests/**/*.test.{ts,tsx}']);
  });
});
