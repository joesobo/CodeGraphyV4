import { afterEach, describe, expect, it } from 'vitest';
import {
  extensionMutationIncludes,
  extensionNodeTestIncludes,
  extensionWebviewAppAndPluginTestIncludes,
  extensionWebviewGraphTestIncludes,
  extensionWebviewPanelsAndExportTestIncludes,
  extensionWebviewTestIncludes,
  resolveExtensionWebviewTestIncludes,
  resolveMutationVitestIncludes,
  workspaceMutationIncludes,
} from '../vitest.includes';

describe('vitest includes', () => {
  afterEach(() => {
    delete process.env.CODEGRAPHY_VITEST_SCOPE;
    delete process.env.CODEGRAPHY_VITEST_INCLUDE_JSON;
    delete process.env.CODEGRAPHY_VITEST_WEBVIEW_GROUP;
  });

  it('defaults mutation scope to extension tests', () => {
    expect(resolveMutationVitestIncludes({})).toEqual(extensionMutationIncludes);
  });

  it('keeps node and webview test projects disjoint', () => {
    expect(extensionNodeTestIncludes).toContain('packages/extension/tests/extension/**/*.test.{ts,tsx}');
    expect(extensionNodeTestIncludes).toContain('!packages/extension/tests/extension/pluginIntegration/typescript.test.ts');
    expect(extensionNodeTestIncludes).not.toContain('packages/extension/tests/webview/**/*.test.{ts,tsx}');
    expect(extensionWebviewTestIncludes).toContain('packages/extension/tests/extension/pluginIntegration/typescript.test.ts');
    expect(extensionWebviewTestIncludes).toContain('packages/extension/tests/webview/graph/**/*.test.{ts,tsx}');
    expect(extensionWebviewTestIncludes).not.toContain('packages/extension/tests/extension/**/*.test.{ts,tsx}');
  });

  it('keeps webview CI groups explicit and non-overlapping', () => {
    const groupedIncludes = [
      ...extensionWebviewGraphTestIncludes,
      ...extensionWebviewAppAndPluginTestIncludes,
      ...extensionWebviewPanelsAndExportTestIncludes,
    ];

    expect(extensionWebviewGraphTestIncludes).toContain('packages/extension/tests/webview/graph/**/*.test.{ts,tsx}');
    expect(extensionWebviewAppAndPluginTestIncludes).toContain('packages/extension/tests/webview/pluginHost/**/*.test.{ts,tsx}');
    expect(extensionWebviewPanelsAndExportTestIncludes).toContain('packages/extension/tests/webview/export/**/*.test.ts');
    expect(new Set(groupedIncludes).size).toBe(groupedIncludes.length);
    expect(extensionWebviewTestIncludes).toEqual(groupedIncludes);
  });

  it('resolves focused webview CI groups', () => {
    expect(resolveExtensionWebviewTestIncludes({
      CODEGRAPHY_VITEST_WEBVIEW_GROUP: 'graph',
    })).toEqual(extensionWebviewGraphTestIncludes);
    expect(resolveExtensionWebviewTestIncludes({
      CODEGRAPHY_VITEST_WEBVIEW_GROUP: 'appPlugins',
    })).toEqual(extensionWebviewAppAndPluginTestIncludes);
    expect(resolveExtensionWebviewTestIncludes({
      CODEGRAPHY_VITEST_WEBVIEW_GROUP: 'panelsExport',
    })).toEqual(extensionWebviewPanelsAndExportTestIncludes);
  });

  it('rejects unknown webview CI groups', () => {
    expect(() => resolveExtensionWebviewTestIncludes({
      CODEGRAPHY_VITEST_WEBVIEW_GROUP: 'half-the-files',
    })).toThrow('Unknown CODEGRAPHY_VITEST_WEBVIEW_GROUP: half-the-files');
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
