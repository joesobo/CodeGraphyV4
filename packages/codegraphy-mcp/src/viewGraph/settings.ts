import * as fs from 'node:fs';
import { getWorkspaceSettingsPath } from '../database/paths';
import type { ViewGraphOptions, ViewGraphSettings } from './model';

const DEFAULT_SETTINGS: ViewGraphSettings = {
  depthMode: false,
  depthLimit: 1,
  includeFolders: false,
  includePackages: false,
  showOrphans: true,
};

interface PersistedRepoSettings {
  showOrphans?: boolean;
  depthMode?: boolean;
  depthLimit?: number;
  nodeVisibility?: Record<string, boolean>;
}

function readPersistedSettings(workspaceRoot: string): PersistedRepoSettings {
  const settingsPath = getWorkspaceSettingsPath(workspaceRoot);
  if (!fs.existsSync(settingsPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as PersistedRepoSettings;
  } catch {
    return {};
  }
}

export function readViewGraphSettings(
  workspaceRoot: string,
  options: ViewGraphOptions = {},
): ViewGraphSettings {
  const persisted = readPersistedSettings(workspaceRoot);
  const nodeVisibility = persisted.nodeVisibility ?? {};

  return {
    depthMode: options.depthMode ?? persisted.depthMode ?? DEFAULT_SETTINGS.depthMode,
    depthLimit: options.depthLimit ?? persisted.depthLimit ?? DEFAULT_SETTINGS.depthLimit,
    includeFolders: options.includeFolders ?? nodeVisibility.folder ?? DEFAULT_SETTINGS.includeFolders,
    includePackages: options.includePackages ?? nodeVisibility.package ?? DEFAULT_SETTINGS.includePackages,
    showOrphans: options.showOrphans ?? persisted.showOrphans ?? DEFAULT_SETTINGS.showOrphans,
  };
}
