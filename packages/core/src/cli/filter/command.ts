import { resolveCodeGraphyWorkspacePath } from '../../workspace/requestPaths';
import {
  readCodeGraphyWorkspaceSettingsOrInitial,
  patchCodeGraphyWorkspaceSettings,
} from '../../workspace/settings';
import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parseTypes';

interface FilterCommandDependencies {
  cwd(): string;
}

const DEFAULT_DEPENDENCIES: FilterCommandDependencies = { cwd: () => process.cwd() };

export function runFilterCommand(
  command: CliCommand,
  dependencies: FilterCommandDependencies = DEFAULT_DEPENDENCIES,
): CommandExecutionResult {
  const workspaceRoot = resolveCodeGraphyWorkspacePath(command.workspacePath, dependencies.cwd());
  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  const action = command.arguments?.action;
  const pattern = command.arguments?.pattern;

  if ((action === 'add' || action === 'remove') && typeof pattern === 'string') {
    const patterns = action === 'add'
      ? [...new Set([...settings.filterPatterns, pattern])]
      : settings.filterPatterns.filter(candidate => candidate !== pattern);
    patchCodeGraphyWorkspaceSettings(workspaceRoot, { filterPatterns: patterns });
    return { exitCode: 0, output: JSON.stringify({ patterns }) };
  }

  return { exitCode: 0, output: JSON.stringify({ patterns: settings.filterPatterns }) };
}
