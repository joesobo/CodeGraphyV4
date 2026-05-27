import { runIndexCommand } from './index/command';
import { runPluginsCommand } from './plugins/command';
import { runSetupCommand } from './setup/command';
import { runStatusCommand } from './status/command';
import type { CliCommand } from './parse';

export interface CommandExecutionResult {
  exitCode: number;
  output: string;
}

function createHelpResult(): CommandExecutionResult {
  return {
    exitCode: 0,
    output: [
      'CodeGraphy CLI',
      '',
      'Commands:',
      '  codegraphy setup',
      '  codegraphy status [workspace]',
      '  codegraphy index [workspace]',
      '  codegraphy plugins <register|list|enable|disable>',
    ].join('\n'),
  };
}

export async function runCliCommand(command: CliCommand): Promise<CommandExecutionResult> {
  switch (command.name) {
    case 'setup':
      return runSetupCommand();
    case 'status':
      return runStatusCommand(command.workspacePath);
    case 'index':
      return runIndexCommand(command.workspacePath);
    case 'plugins':
      return runPluginsCommand(command);
    case 'help':
    default:
      return createHelpResult();
  }
}
