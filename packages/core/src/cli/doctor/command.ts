import * as fs from 'node:fs';
import { createPluginActivityState } from '../../plugins/activityState/model';
import { readCodeGraphyInstalledPluginCache } from '../../plugins/installedCache';
import { resolveCodeGraphyWorkspacePath } from '../../workspace/requestPaths';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  createInitialCodeGraphyWorkspaceSettings,
  readCodeGraphyWorkspaceSettingsOrInitial,
  WorkspaceSettingsError,
} from '../../workspace/settings';
import { getWorkspaceSettingsPath } from '../../workspace/paths';
import { readCodeGraphyWorkspaceStatus } from '../../workspace/status';
import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parser/protocol';
import { inspectWorkspaceAnalysisDatabase } from '../../graphCache/database/storage';
import { readCodeGraphyWorkspaceMeta } from '../../workspace/meta';
import { createDoctorCacheCheck } from './cacheCheck/model';

export const SUPPORTED_NODE_RUNTIME_RANGE = '^22.14.0 || >=23.6.0';

export function isSupportedNodeRuntime(version: string): boolean {
  const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
  if (!stableVersion) {
    return false;
  }

  const major = Number(stableVersion[1]);
  const minor = Number(stableVersion[2]);
  return (major === 22 && minor >= 14)
    || (major === 23 && minor >= 6)
    || major >= 24;
}

function readSettingsCheck(workspaceRoot: string): Record<string, unknown> {
  const settingsPath = getWorkspaceSettingsPath(workspaceRoot);
  if (!fs.existsSync(settingsPath)) {
    return {
      ok: false,
      path: settingsPath,
      action: 'Run `codegraphy index` to create workspace settings.',
    };
  }
  try {
    readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
    return { ok: true, path: settingsPath };
  } catch (error) {
    return {
      ok: false,
      path: settingsPath,
      message: error instanceof WorkspaceSettingsError
        ? error.reason
        : error instanceof Error ? error.message : String(error),
      action: 'Repair `.codegraphy/settings.json`, then rerun `codegraphy doctor`.',
    };
  }
}

export function runDoctorCommand(command: CliCommand): CommandExecutionResult {
  const workspaceRoot = resolveCodeGraphyWorkspacePath(command.workspacePath, process.cwd());
  const runtimeOk = isSupportedNodeRuntime(process.versions.node);
  const settingsCheck = readSettingsCheck(workspaceRoot);
  const settings = settingsCheck.ok
    ? readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot)
    : createInitialCodeGraphyWorkspaceSettings();
  const status = readCodeGraphyWorkspaceStatus(workspaceRoot, { settings });
  const meta = readCodeGraphyWorkspaceMeta(workspaceRoot);
  const cacheInspection = inspectWorkspaceAnalysisDatabase(workspaceRoot);
  const activity = createPluginActivityState({
    settings,
    installedPlugins: readCodeGraphyInstalledPluginCache().plugins,
    builtInPluginIds: [CODEGRAPHY_MARKDOWN_PLUGIN_ID],
  });
  const checks = {
    runtime: {
      ok: runtimeOk,
      version: process.version,
      supported: SUPPORTED_NODE_RUNTIME_RANGE,
      ...(runtimeOk ? {} : {
        action: `Use a Node.js version matching ${SUPPORTED_NODE_RUNTIME_RANGE}.`,
      }),
    },
    settings: settingsCheck,
    cache: createDoctorCacheCheck({
      status,
      inspection: cacheInspection,
      indexedAt: meta.lastIndexedAt,
    }),
    plugins: {
      ok: activity.warnings.length === 0,
      enabled: [...activity.activePluginIds],
      warnings: activity.warnings,
      ...(activity.warnings.length > 0 ? { action: 'Register missing plugins or disable their workspace entries.' } : {}),
    },
  };
  const healthy = Object.values(checks).every(check => check.ok === true);
  return { exitCode: healthy ? 0 : 1, output: JSON.stringify({ healthy, checks }) };
}
