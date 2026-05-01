import { runListCommand } from '../list/command';
import { runMcpServer } from '../mcp/server';
import { runIndexCommand } from '../index/command';
import { runOpenCommand } from '../open/command';
import { runSetupCommand } from '../setup/command';
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
      '  codegraphy open <repo>',
      '  codegraphy index',
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
    case 'open':
      return runOpenCommand(command.repoPath);
    case 'index':
      return runIndexCommand();
    case 'mcp':
      await runMcpServer();
      return { exitCode: 0, output: '' };
    case 'help':
    default:
      return createHelpResult();
  }
}
