import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parse';
import { DEFAULT_DEPENDENCIES, type PluginsCommandDependencies } from './dependencies';
import { runDisableCommand } from './disable';
import { runEnableCommand } from './enable';
import { createHelpResult } from './help';
import { runLinkCommand } from './link';
import { runListCommand } from './list';
import { runRegisterCommand } from './register';

export async function runPluginsCommand(
  command: CliCommand,
  dependencies: Partial<PluginsCommandDependencies> = {},
): Promise<CommandExecutionResult> {
  const mergedDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...dependencies,
  };

  try {
    switch (command.action) {
      case 'register':
        return await Promise.resolve(runRegisterCommand(command, mergedDependencies));
      case 'link':
        return await Promise.resolve(runLinkCommand(command, mergedDependencies));
      case 'enable':
        return await Promise.resolve(runEnableCommand(command, mergedDependencies));
      case 'disable':
        return await Promise.resolve(runDisableCommand(command, mergedDependencies));
      case 'list':
        return await Promise.resolve(runListCommand(command, mergedDependencies));
      case 'help':
      default:
        return createHelpResult();
    }
  } catch (error) {
    return {
      exitCode: 1,
      output: error instanceof Error ? error.message : String(error),
    };
  }
}
