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
  const runtimeMajor = Number(process.versions.node.split('.')[0]);
  const runtimeOk = runtimeMajor >= 20 && runtimeMajor < 23;
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
      supported: '>=20 <23',
      ...(runtimeOk ? {} : { action: 'Use Node.js 20, 21, or 22.' }),
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
