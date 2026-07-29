import { getWorkspaceSettingsPath } from '../../workspace/paths';
import { resolveCodeGraphyWorkspacePath } from '../../workspace/requestPaths';
import {
  patchCodeGraphyWorkspaceSettings,
  readCodeGraphyWorkspaceSettingsOrInitial,
  removeCodeGraphyWorkspaceSetting,
} from '../../workspace/settings';
import { workspaceSettingChangeRequiresIndex } from '../../workspace/indexRequirement';
import type { CommandExecutionResult } from '../command';
import type { SettingsCliCommand } from '../parser/protocol';

function settingValue(settings: object, key: string): unknown {
  return Reflect.get(settings, key) as unknown;
}

export function runSettingsCommand(command: SettingsCliCommand): CommandExecutionResult {
  const workspaceRoot = resolveCodeGraphyWorkspacePath(command.workspacePath, process.cwd());
  const settingsPath = getWorkspaceSettingsPath(workspaceRoot);
  const current = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  const settingsCommand = command.settings;

  if (settingsCommand.action === 'list') {
    return {
      exitCode: 0,
      output: JSON.stringify({ workspaceRoot, settingsPath, settings: current }),
    };
  }
  const key = settingsCommand.key;
  const previous = settingValue(current, key);
  if (settingsCommand.action === 'get') {
    return {
      exitCode: 0,
      output: JSON.stringify({ workspaceRoot, settingsPath, key, value: previous }),
    };
  }

  if (settingsCommand.action === 'set') {
    patchCodeGraphyWorkspaceSettings(workspaceRoot, { [key]: settingsCommand.value });
  } else {
    removeCodeGraphyWorkspaceSetting(workspaceRoot, key);
  }
  const updated = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  const indexRequired = workspaceSettingChangeRequiresIndex({
    key,
    previous,
    settings: updated,
    workspaceRoot,
  });
  return {
    exitCode: 0,
    output: JSON.stringify({
      workspaceRoot,
      settingsPath,
      key,
      previous,
      value: settingValue(updated, key),
      indexRequired,
      ...(indexRequired ? { action: 'Run `codegraphy index` before querying cached AST or Relationships.' } : {}),
    }),
  };
}
