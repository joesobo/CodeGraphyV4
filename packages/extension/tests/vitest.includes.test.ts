import { afterEach, describe, expect, it } from 'vitest';
import {
  extensionMutationIncludes,
  extensionNodeTestIncludes,
  extensionWebviewTestIncludes,
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

  it('keeps node and webview test projects disjoint', () => {
    expect(extensionNodeTestIncludes).toContain('packages/extension/tests/extension/**/*.test.{ts,tsx}');
    expect(extensionNodeTestIncludes).toContain('!packages/extension/tests/extension/pluginIntegration/typescript.test.ts');
    expect(extensionNodeTestIncludes).not.toContain('packages/extension/tests/webview/**/*.test.{ts,tsx}');
    expect(extensionWebviewTestIncludes).toContain('packages/extension/tests/extension/pluginIntegration/typescript.test.ts');
    expect(extensionWebviewTestIncludes).toContain('packages/extension/tests/webview/**/*.test.{ts,tsx}');
    expect(extensionWebviewTestIncludes).not.toContain('packages/extension/tests/extension/**/*.test.{ts,tsx}');
  });

  it('switches mutation scope to workspace tests when requested', () => {
    expect(resolveMutationVitestIncludes({
      CODEGRAPHY_VITEST_SCOPE: 'workspace',
    })).toEqual(workspaceMutationIncludes);
  });

  it('prefers explicit mutation include overrides', () => {
    process.env.CODEGRAPHY_VITEST_SCOPE = 'workspace';
    process.env.CODEGRAPHY_VITEST_INCLUDE_JSON = JSON.stringify(['packages/plugin-godot/tests/**/*.test.ts']);

    expect(resolveMutationVitestIncludes()).toEqual(['packages/plugin-godot/tests/**/*.test.ts']);
  });
});
