import * as fs from 'node:fs';
import { createPluginActivityState } from '../../plugins/activityState/model';
import { readCodeGraphyInstalledPluginCache } from '../../plugins/installedCache';
import { resolveCodeGraphyWorkspacePath } from '../../workspace/requestPaths';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  readCodeGraphyWorkspaceSettingsOrInitial,
} from '../../workspace/settings';
import { getWorkspaceSettingsPath } from '../../workspace/paths';
import { readCodeGraphyWorkspaceStatus } from '../../workspace/status';
import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parseTypes';
import { hasSupportedRawPluginIdentity } from '../../workspace/settingsPlugins';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(entry => typeof entry === 'string');
}

function isBooleanRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every(entry => typeof entry === 'boolean');
}

function validateKnownSettings(value: Record<string, unknown>): string | undefined {
  const stringArrays = ['include', 'filterPatterns', 'disabledCustomFilterPatterns'] as const;
  for (const key of stringArrays) {
    if (key in value && !isStringArray(value[key])) return `${key} must be an array of strings`;
  }
  const booleans = ['respectGitignore', 'showOrphans'] as const;
  for (const key of booleans) {
    if (key in value && typeof value[key] !== 'boolean') return `${key} must be a boolean`;
  }
  if ('maxFiles' in value && (typeof value.maxFiles !== 'number' || !Number.isFinite(value.maxFiles))) {
    return 'maxFiles must be a finite number';
  }
  if ('nodeVisibility' in value && !isBooleanRecord(value.nodeVisibility)) {
    return 'nodeVisibility must be an object of boolean values';
  }
  if ('edgeVisibility' in value && !isBooleanRecord(value.edgeVisibility)) {
    return 'edgeVisibility must be an object of boolean values';
  }
  if ('pluginData' in value && !isRecord(value.pluginData)) return 'pluginData must be an object';
  if ('plugins' in value) {
    if (!Array.isArray(value.plugins)) return 'plugins must be an array';
    for (const entry of value.plugins) {
      if (!isRecord(entry)) return 'plugins entries must be objects';
      if ('id' in entry && typeof entry.id !== 'string') return 'plugin id must be a string';
      if ('package' in entry && typeof entry.package !== 'string') return 'plugin package must be a string';
      if ('enabled' in entry && typeof entry.enabled !== 'boolean') return 'plugin enabled must be a boolean';
      if ('options' in entry && !isRecord(entry.options)) return 'plugin options must be an object';
      if ('disabledFilterPatterns' in entry && !isStringArray(entry.disabledFilterPatterns)) {
        return 'plugin disabledFilterPatterns must be an array of strings';
      }
      if (!hasSupportedRawPluginIdentity(entry)) {
        return 'plugin entry must have a nonblank id with enabled, or a nonblank package';
      }
    }
  }
  return undefined;
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
    const value: unknown = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    if (!isRecord(value)) throw new Error('expected a JSON object');
    const validationError = validateKnownSettings(value);
    if (validationError) throw new Error(validationError);
    return { ok: true, path: settingsPath };
  } catch (error) {
    return {
      ok: false,
      path: settingsPath,
      message: error instanceof Error ? error.message : String(error),
      action: 'Repair `.codegraphy/settings.json`, then rerun `codegraphy doctor`.',
    };
  }
}

export function runDoctorCommand(command: CliCommand): CommandExecutionResult {
  const workspaceRoot = resolveCodeGraphyWorkspacePath(command.workspacePath, process.cwd());
  const runtimeMajor = Number(process.versions.node.split('.')[0]);
  const runtimeOk = runtimeMajor >= 20 && runtimeMajor < 23;
  const settingsCheck = readSettingsCheck(workspaceRoot);
  const status = readCodeGraphyWorkspaceStatus(workspaceRoot);
  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
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
    cache: {
      ok: status.state === 'fresh',
      state: status.state,
      path: status.graphCachePath,
      ...(status.state === 'fresh' ? {} : { action: 'Run `codegraphy index`.' }),
    },
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
