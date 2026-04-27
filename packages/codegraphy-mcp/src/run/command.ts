import { runListCommand } from '../list/command';
import { runMcpServer } from '../mcp/server';
import { runReindexCommand } from '../reindex/command';
import { runSetupCommand } from '../setup/command';
import { runStatusCommand } from '../status/command';
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
      '  codegraphy list',
      '  codegraphy status [path]',
      '  codegraphy reindex [path]',
      '  codegraphy mcp',
    ].join('\n'),
  };
}

export async function runCliCommand(command: CliCommand): Promise<CommandExecutionResult> {
  switch (command.name) {
    case 'setup':
      return runSetupCommand();
    case 'list':
      return runListCommand();
    case 'status':
      return runStatusCommand(command.repoPath);
    case 'reindex':
      return runReindexCommand(command.repoPath);
    case 'mcp':
      await runMcpServer();
      return { exitCode: 0, output: '' };
    case 'help':
    default:
      return createHelpResult();
  }
}
