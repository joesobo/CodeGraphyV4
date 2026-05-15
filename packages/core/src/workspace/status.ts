import * as fs from 'node:fs';
import type { IPlugin } from '@codegraphy/plugin-api';
import { createMarkdownPlugin } from '@codegraphy/plugin-markdown';
import { WORKSPACE_ANALYSIS_CACHE_VERSION } from '../analysis/cache';
import { createTreeSitterPlugin } from '../treeSitter/plugin';
import { readCodeGraphyInstalledPluginCache } from '../plugins/installedCache';
import { getGraphCachePath, resolveWorkspaceRoot } from './paths';
import { readCodeGraphyWorkspaceMeta } from './meta';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  readCodeGraphyWorkspaceSettings,
  type CodeGraphyWorkspaceSettings,
} from './settings';
import {
  createCodeGraphyWorkspacePackageAwarePluginSignature,
  createCodeGraphyWorkspacePluginSignature,
  createCodeGraphyWorkspaceSettingsSignature,
} from './signatures';

export type CodeGraphyWorkspaceStatusState = 'fresh' | 'stale' | 'missing';
export type CodeGraphyWorkspaceStaleReason =
  | 'never-indexed'
  | 'graph-cache-missing'
  | 'plugin-signature-changed'
  | 'settings-signature-changed'
  | 'analysis-version-changed'
  | 'pending-changed-files';

export interface CodeGraphyWorkspaceStatus {
  workspaceRoot: string;
  graphCachePath: string;
  state: CodeGraphyWorkspaceStatusState;
  hasGraphCache: boolean;
  staleReasons: CodeGraphyWorkspaceStaleReason[];
  detail: string;
}

export interface ReadCodeGraphyWorkspaceStatusOptions {
  plugins?: ReadonlyArray<Pick<IPlugin, 'id' | 'version'>>;
  pluginSignature?: string | null;
  settings?: CodeGraphyWorkspaceSettings;
  settingsSignature?: string;
  exists?: (filePath: string) => boolean;
  userHomeDir?: string;
}

function createDetail(
  state: CodeGraphyWorkspaceStatusState,
  reasons: readonly CodeGraphyWorkspaceStaleReason[],
): string {
  if (state === 'fresh') {
    return 'CodeGraphy Workspace Graph Cache is fresh.';
  }

  if (reasons.includes('never-indexed')) {
    return 'CodeGraphy Workspace Graph Cache is missing. Run Indexing to build it.';
  }

  if (reasons.includes('graph-cache-missing')) {
    return 'CodeGraphy Workspace Graph Cache file is missing. Run Indexing to rebuild it.';
  }

  if (reasons.includes('pending-changed-files')) {
    return 'CodeGraphy Workspace Graph Cache is stale: files changed since the last Indexing run.';
  }

  if (reasons.includes('plugin-signature-changed')) {
    return 'CodeGraphy Workspace Graph Cache is stale: enabled plugins changed.';
  }

  if (reasons.includes('settings-signature-changed')) {
    return 'CodeGraphy Workspace Graph Cache is stale: Workspace Settings changed.';
  }

  if (reasons.includes('analysis-version-changed')) {
    return 'CodeGraphy Workspace Graph Cache is stale: the analysis schema changed.';
  }

  return 'CodeGraphy Workspace Graph Cache is stale. Run Indexing to refresh it.';
}

function collectStaleReasons(input: {
  hasGraphCache: boolean;
  indexedAt: string | null;
  metaPluginSignature: string | null;
  metaSettingsSignature: string | null;
  metaAnalysisVersion: string | null;
  pendingChangedFiles: readonly string[];
  pluginSignature: string | null;
  settingsSignature: string;
}): CodeGraphyWorkspaceStaleReason[] {
  if (!input.hasGraphCache) {
    return input.indexedAt === null ? ['never-indexed'] : ['graph-cache-missing'];
  }

  if (input.indexedAt === null) {
    return ['never-indexed'];
  }

  return [
    ...(input.pendingChangedFiles.length > 0 ? ['pending-changed-files' as const] : []),
    ...(input.metaPluginSignature !== input.pluginSignature ? ['plugin-signature-changed' as const] : []),
    ...(input.metaSettingsSignature !== input.settingsSignature ? ['settings-signature-changed' as const] : []),
    ...(input.metaAnalysisVersion !== WORKSPACE_ANALYSIS_CACHE_VERSION ? ['analysis-version-changed' as const] : []),
  ];
}

function createDefaultStatusRuntimePlugins(
  settings: CodeGraphyWorkspaceSettings,
): Array<Pick<IPlugin, 'id' | 'version'>> {
  const plugins: Array<Pick<IPlugin, 'id' | 'version'>> = [createTreeSitterPlugin()];
  if (settings.plugins.some(plugin => plugin.package === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME)) {
    plugins.push(createMarkdownPlugin());
  }
  return plugins;
}

function createDefaultStatusPluginSignature(
  settings: CodeGraphyWorkspaceSettings,
  homeDir: string | undefined,
): string | null {
  const installedRecordsByPackage = new Map(
    readCodeGraphyInstalledPluginCache({
      ...(homeDir ? { homeDir } : {}),
    })
      .plugins
      .map(plugin => [plugin.package, plugin] as const),
  );
  const enabledPackagePlugins = settings.plugins
    .filter(plugin => plugin.package !== CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME);
  const packagePlugins = enabledPackagePlugins
    .map(plugin => installedRecordsByPackage.get(plugin.package))
    .filter((plugin): plugin is NonNullable<typeof plugin> => plugin !== undefined);
  const missingPackagePlugins = enabledPackagePlugins
    .filter(plugin => !installedRecordsByPackage.has(plugin.package))
    .map(plugin => plugin.package);

  return createCodeGraphyWorkspacePackageAwarePluginSignature({
    runtimePlugins: createDefaultStatusRuntimePlugins(settings),
    packagePlugins,
    missingPackagePlugins,
  });
}

export function readCodeGraphyWorkspaceStatus(
  workspaceRoot: string,
  options: ReadCodeGraphyWorkspaceStatusOptions = {},
): CodeGraphyWorkspaceStatus {
  const resolvedWorkspaceRoot = resolveWorkspaceRoot(workspaceRoot);
  const graphCachePath = getGraphCachePath(resolvedWorkspaceRoot);
  const hasGraphCache = (options.exists ?? fs.existsSync)(graphCachePath);
  const meta = readCodeGraphyWorkspaceMeta(resolvedWorkspaceRoot);
  const settings = options.settings ?? readCodeGraphyWorkspaceSettings(resolvedWorkspaceRoot);
  const settingsSignature = options.settingsSignature ?? createCodeGraphyWorkspaceSettingsSignature(settings);
  const pluginSignature = options.pluginSignature
    ?? (options.plugins
      ? createCodeGraphyWorkspacePluginSignature(options.plugins)
      : createDefaultStatusPluginSignature(settings, options.userHomeDir));
  const staleReasons = collectStaleReasons({
    hasGraphCache,
    indexedAt: meta.lastIndexedAt,
    metaPluginSignature: meta.pluginSignature,
    metaSettingsSignature: meta.settingsSignature,
    metaAnalysisVersion: meta.analysisVersion,
    pendingChangedFiles: meta.pendingChangedFiles,
    pluginSignature,
    settingsSignature,
  });
  const state: CodeGraphyWorkspaceStatusState = staleReasons.length === 0
    ? 'fresh'
    : hasGraphCache && !staleReasons.includes('never-indexed') && !staleReasons.includes('graph-cache-missing')
      ? 'stale'
      : 'missing';

  return {
    workspaceRoot: resolvedWorkspaceRoot,
    graphCachePath,
    state,
    hasGraphCache,
    staleReasons,
    detail: createDetail(state, staleReasons),
  };
}
