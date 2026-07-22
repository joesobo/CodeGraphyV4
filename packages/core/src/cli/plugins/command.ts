import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parse';
import { DEFAULT_DEPENDENCIES, type PluginsCommandDependencies } from './dependencies';
import { runDisableCommand } from './disable';
import { runEnableCommand } from './enable';
import { createHelpResult } from './help';
import { runInheritCommand } from './inherit';
import { runLinkCommand } from './link';
import { runListCommand } from './list';
import { runRegisterCommand } from './register';

type PluginCommandRunner = (
  command: CliCommand,
  dependencies: PluginsCommandDependencies,
) => CommandExecutionResult | Promise<CommandExecutionResult>;

type PluginCommandAction = Exclude<CliCommand['action'], undefined | 'help'>;

const PLUGIN_COMMAND_RUNNERS: Partial<Record<PluginCommandAction, PluginCommandRunner>> = {
  register: runRegisterCommand,
  link: runLinkCommand,
  enable: runEnableCommand,
  disable: runDisableCommand,
  inherit: runInheritCommand,
  list: runListCommand,
};

export async function runPluginsCommand(
  command: CliCommand,
  dependencies: Partial<PluginsCommandDependencies> = {},
): Promise<CommandExecutionResult> {
  const mergedDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...dependencies,
  };

  try {
    const action = command.action as PluginCommandAction | undefined;
    const runner = action ? PLUGIN_COMMAND_RUNNERS[action] : undefined;
    return runner
      ? await Promise.resolve(runner(command, mergedDependencies))
      : createHelpResult();
  } catch (error) {
    return {
      exitCode: 1,
      output: error instanceof Error ? error.message : String(error),
    };
  }
}
