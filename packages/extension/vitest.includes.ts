export const extensionMutationIncludes = [
  'packages/extension/tests/**/*.test.{ts,tsx}',
];

export const extensionNodeTestIncludes = [
  'packages/extension/tests/acceptance/**/*.test.ts',
  'packages/extension/tests/core/**/*.test.{ts,tsx}',
  'packages/extension/tests/extension/**/*.test.{ts,tsx}',
  '!packages/extension/tests/extension/pluginIntegration/typescript.test.ts',
  'packages/extension/tests/integration/**/*.test.ts',
  'packages/extension/tests/shared/**/*.test.{ts,tsx}',
  'packages/extension/tests/*.test.ts',
];

export const extensionWebviewGraphTestIncludes = [
  'packages/extension/tests/webview/ContextMenu.test.tsx',
  'packages/extension/tests/webview/Graph*.test.tsx',
  'packages/extension/tests/webview/PhysicsFlow.test.tsx',
  'packages/extension/tests/webview/graph/**/*.test.{ts,tsx}',
  'packages/extension/tests/webview/graphControls/**/*.test.{ts,tsx}',
  'packages/extension/tests/webview/graphCornerControls/**/*.test.{ts,tsx}',
  'packages/extension/tests/webview/graphIndexStatus/**/*.test.{ts,tsx}',
  'packages/extension/tests/webview/graphScope/**/*.test.{ts,tsx}',
];

export const extensionWebviewAppAndPluginTestIncludes = [
  'packages/extension/tests/extension/pluginIntegration/typescript.test.ts',
  'packages/extension/tests/integration/**/*.test.tsx',
  'packages/extension/tests/webview/app/**/*.test.{ts,tsx}',
  'packages/extension/tests/webview/main.test.tsx',
  'packages/extension/tests/webview/pluginHost/**/*.test.{ts,tsx}',
  'packages/extension/tests/webview/pluginRuntime/**/*.test.{ts,tsx}',
  'packages/extension/tests/webview/plugins/**/*.test.{ts,tsx}',
  'packages/extension/tests/webview/store/**/*.test.ts',
  'packages/extension/tests/webview/theme/**/*.test.ts',
  'packages/extension/tests/webview/vscodeApi*.test.ts',
  'packages/extension/tests/webview/wasm/**/*.test.ts',
];

export const extensionWebviewPanelsAndExportTestIncludes = [
  'packages/extension/tests/webview/Toolbar.test.tsx',
  'packages/extension/tests/webview/colorParsing.test.ts',
  'packages/extension/tests/webview/colorParsing/**/*.test.ts',
  'packages/extension/tests/webview/globMatch.test.ts',
  'packages/extension/tests/webview/searchFilter.test.ts',
  'packages/extension/tests/webview/useTheme.test.tsx',
  'packages/extension/tests/webview/components/**/*.test.{ts,tsx}',
  'packages/extension/tests/webview/export/**/*.test.ts',
  'packages/extension/tests/webview/legends/**/*.test.{ts,tsx}',
  'packages/extension/tests/webview/nodeTooltip/**/*.test.{ts,tsx}',
  'packages/extension/tests/webview/search/**/*.test.ts',
  'packages/extension/tests/webview/searchBar/**/*.test.{ts,tsx}',
  'packages/extension/tests/webview/settingsPanel/**/*.test.{ts,tsx}',
  'packages/extension/tests/webview/toolbar/**/*.test.{ts,tsx}',
];

export const extensionWebviewTestIncludes = [
  ...extensionWebviewGraphTestIncludes,
  ...extensionWebviewAppAndPluginTestIncludes,
  ...extensionWebviewPanelsAndExportTestIncludes,
];

export const extensionWebviewTestGroups = {
  graph: extensionWebviewGraphTestIncludes,
  appPlugins: extensionWebviewAppAndPluginTestIncludes,
  panelsExport: extensionWebviewPanelsAndExportTestIncludes,
} as const;

export type ExtensionWebviewTestGroup = keyof typeof extensionWebviewTestGroups;

export const workspaceMutationIncludes = [
  'packages/*/tests/**/*.test.{ts,tsx}',
];

type ScopeEnv = Partial<Pick<
  NodeJS.ProcessEnv,
  | 'CODEGRAPHY_VITEST_INCLUDE_JSON'
  | 'CODEGRAPHY_VITEST_SCOPE'
  | 'CODEGRAPHY_VITEST_WEBVIEW_GROUP'
  | 'QUALITY_TOOLS_VITEST_INCLUDE_JSON'
>>;

function isExtensionWebviewTestGroup(value: string): value is ExtensionWebviewTestGroup {
  return value in extensionWebviewTestGroups;
}

export function resolveExtensionWebviewTestIncludes(environment: ScopeEnv = process.env): string[] {
  const group = environment.CODEGRAPHY_VITEST_WEBVIEW_GROUP;
  if (!group) {
    return extensionWebviewTestIncludes;
  }

  if (isExtensionWebviewTestGroup(group)) {
    return extensionWebviewTestGroups[group];
  }

  throw new Error(`Unknown CODEGRAPHY_VITEST_WEBVIEW_GROUP: ${group}`);
}

export function resolveMutationVitestIncludes(environment: ScopeEnv = process.env): string[] {
  const explicitIncludes = environment.QUALITY_TOOLS_VITEST_INCLUDE_JSON
    ?? environment.CODEGRAPHY_VITEST_INCLUDE_JSON;

  if (explicitIncludes) {
    return JSON.parse(explicitIncludes) as string[];
  }

  return environment.CODEGRAPHY_VITEST_SCOPE === 'workspace'
    ? workspaceMutationIncludes
    : extensionMutationIncludes;
}
