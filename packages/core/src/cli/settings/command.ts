import { getWorkspaceSettingsPath } from '../../workspace/paths';
import { resolveCodeGraphyWorkspacePath } from '../../workspace/requestPaths';
import {
  patchCodeGraphyWorkspaceSettings,
  readCodeGraphyWorkspaceSettingsOrInitial,
  removeCodeGraphyWorkspaceSetting,
} from '../../workspace/settings';
import { readCodeGraphyWorkspaceStatus } from '../../workspace/status';
import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parseTypes';

function settingValue(settings: object, key: string): unknown {
  return Reflect.get(settings, key) as unknown;
}

export function runSettingsCommand(command: CliCommand): CommandExecutionResult {
  const workspaceRoot = resolveCodeGraphyWorkspacePath(command.workspacePath, process.cwd());
  const settingsPath = getWorkspaceSettingsPath(workspaceRoot);
  const current = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  const key = command.settingsKey;

  if (!command.settingsAction) {
    return {
      exitCode: 0,
      output: JSON.stringify({ workspaceRoot, settingsPath, settings: current }),
    };
  }
  if (!key) throw new Error('Workspace setting key is required');
  const previous = settingValue(current, key);
  if (command.settingsAction === 'get') {
    return {
      exitCode: 0,
      output: JSON.stringify({ workspaceRoot, settingsPath, key, value: previous }),
    };
  }

  if (command.settingsAction === 'set') {
    patchCodeGraphyWorkspaceSettings(workspaceRoot, { [key]: command.settingsValue });
  } else {
    removeCodeGraphyWorkspaceSetting(workspaceRoot, key);
  }
  const updated = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  const status = readCodeGraphyWorkspaceStatus(workspaceRoot);
  return {
    exitCode: 0,
    output: JSON.stringify({
      workspaceRoot,
      settingsPath,
      key,
      previous,
      value: settingValue(updated, key),
      indexRequired: status.state !== 'fresh',
      ...(status.state === 'fresh' ? {} : { action: 'Run `codegraphy index` before querying cached AST or Relationships.' }),
    }),
  };
}
