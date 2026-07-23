import * as fs from 'node:fs';
import { getGraphCachePath, resolveWorkspaceRoot } from './paths';
import { readCodeGraphyWorkspaceMeta } from './meta';
import {
  readCodeGraphyWorkspaceSettings,
} from './settings';
import {
  createCodeGraphyWorkspacePluginSignature,
  createCodeGraphyWorkspaceSettingsSignature,
} from './signatures';
import { createCodeGraphyWorkspaceStatusDetail } from './statusDetail';
import {
  createDefaultStatusCorePluginIds,
  createDefaultStatusPluginSignature,
} from './statusPlugins';
import {
  collectCodeGraphyWorkspaceStaleReasons,
} from './statusReasons';
import { filterWorkspaceStatusPendingChangedFiles } from './statusPendingFiles';
import { createCodeGraphyWorkspaceStatusState } from './statusState';
export type {
  CodeGraphyWorkspaceStatus,
  CodeGraphyWorkspaceStaleReason,
  CodeGraphyWorkspaceStatusState,
  ReadCodeGraphyWorkspaceStatusOptions,
} from './statusContracts';
import type {
  CodeGraphyWorkspaceStatus,
  ReadCodeGraphyWorkspaceStatusOptions,
} from './statusContracts';

export function readCodeGraphyWorkspaceStatus(
  workspaceRoot: string,
  options: ReadCodeGraphyWorkspaceStatusOptions = {},
): CodeGraphyWorkspaceStatus {
  const resolvedWorkspaceRoot = resolveWorkspaceRoot(workspaceRoot);
  const graphCachePath = getGraphCachePath(resolvedWorkspaceRoot);
  const hasGraphCache = (options.exists ?? fs.existsSync)(graphCachePath);
  const meta = readCodeGraphyWorkspaceMeta(resolvedWorkspaceRoot);
  const settings = options.settings ?? readCodeGraphyWorkspaceSettings(resolvedWorkspaceRoot);
  const settingsSignature = options.settingsSignature ?? createCodeGraphyWorkspaceSettingsSignature(
    settings,
    options.plugins
      ? new Set(options.plugins.map(plugin => plugin.id))
      : createDefaultStatusCorePluginIds(settings, options.userHomeDir),
  );
  const pluginSignature = options.pluginSignature
    ?? (options.plugins
      ? createCodeGraphyWorkspacePluginSignature(options.plugins)
      : createDefaultStatusPluginSignature(settings, options.userHomeDir));
  const comparesPluginBuild = Object.prototype.hasOwnProperty.call(options, 'pluginBuildSignature');
  const comparableMetaPluginSignature = comparesPluginBuild
    ? JSON.stringify([meta.pluginSignature, meta.pluginBuildSignature])
    : meta.pluginSignature;
  const comparablePluginSignature = comparesPluginBuild
    ? JSON.stringify([pluginSignature, options.pluginBuildSignature ?? null])
    : pluginSignature;
  const pendingChangedFiles = filterWorkspaceStatusPendingChangedFiles(
    meta.pendingChangedFiles,
    {
      lastIndexedAt: meta.lastIndexedAt,
      workspaceRoot: resolvedWorkspaceRoot,
    },
  );
  const staleReasons = collectCodeGraphyWorkspaceStaleReasons({
    hasGraphCache,
    indexedAt: meta.lastIndexedAt,
    metaPluginSignature: comparableMetaPluginSignature,
    metaSettingsSignature: meta.settingsSignature,
    metaAnalysisVersion: meta.analysisVersion,
    pendingChangedFiles,
    pluginSignature: comparablePluginSignature,
    settingsSignature,
  });
  const state = createCodeGraphyWorkspaceStatusState({ hasGraphCache, staleReasons });

  return {
    workspaceRoot: resolvedWorkspaceRoot,
    graphCachePath,
    state,
    hasGraphCache,
    staleReasons,
    detail: createCodeGraphyWorkspaceStatusDetail(state, staleReasons),
  };
}
