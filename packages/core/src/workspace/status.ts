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
import { createDefaultStatusPluginSignature } from './statusPlugins';
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
  const settingsSignature = options.settingsSignature ?? createCodeGraphyWorkspaceSettingsSignature(settings);
  const pluginSignature = options.pluginSignature
    ?? (options.plugins
      ? createCodeGraphyWorkspacePluginSignature(options.plugins)
      : createDefaultStatusPluginSignature(settings, options.userHomeDir));
  const pendingChangedFiles = filterWorkspaceStatusPendingChangedFiles(
    meta.pendingChangedFiles,
    { workspaceRoot: resolvedWorkspaceRoot },
  );
  const staleReasons = collectCodeGraphyWorkspaceStaleReasons({
    hasGraphCache,
    indexedAt: meta.lastIndexedAt,
    metaPluginSignature: meta.pluginSignature,
    metaSettingsSignature: meta.settingsSignature,
    metaAnalysisVersion: meta.analysisVersion,
    pendingChangedFiles,
    pluginSignature,
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
