import { runIndexCommand } from './index/command';
import { runPluginsCommand } from './plugins/command';
import { runSetupCommand } from './setup/command';
import { runStatusCommand } from './status/command';
import type { CliCommand } from './parse';
import { createDiagnosticEvent, formatDiagnosticEventLine } from '../diagnostics/events';

export interface CommandExecutionResult {
  exitCode: number;
  output: string;
}

export interface CliCommandDependencies {
  writeDiagnostic?(line: string): void;
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
      '  codegraphy plugins <register|link|list|enable|disable>',
    ].join('\n'),
  };
}

function emitCliDiagnostic(
  command: CliCommand,
  dependencies: CliCommandDependencies,
  event: string,
  context: Record<string, unknown>,
): void {
  if (!command.verbose) {
    return;
  }

  const writeDiagnostic = dependencies.writeDiagnostic ?? ((line: string) => {
    process.stderr.write(`${line}\n`);
  });
  writeDiagnostic(formatDiagnosticEventLine(createDiagnosticEvent({
    area: 'cli',
    event,
    context,
  })));
}

function createCommandContext(command: CliCommand): Record<string, unknown> {
  return {
    command: command.name,
    ...(command.action ? { action: command.action } : {}),
    ...(command.packageName ? { packageName: command.packageName } : {}),
    ...(command.packageRoot ? { packageRoot: command.packageRoot } : {}),
    ...(command.workspacePath ? { workspacePath: command.workspacePath } : {}),
  };
}

export async function runCliCommand(
  command: CliCommand,
  dependencies: CliCommandDependencies = {},
): Promise<CommandExecutionResult> {
  emitCliDiagnostic(command, dependencies, 'command-started', createCommandContext(command));
  let result: CommandExecutionResult;

  switch (command.name) {
    case 'setup':
      result = runSetupCommand();
      break;
    case 'status':
      result = runStatusCommand(command.workspacePath);
      break;
    case 'index':
      result = await runIndexCommand(command.workspacePath);
      break;
    case 'plugins':
      result = await runPluginsCommand(command);
      break;
    case 'help':
    default:
      result = createHelpResult();
  }

  emitCliDiagnostic(command, dependencies, 'command-completed', {
    command: command.name,
    exitCode: result.exitCode,
  });

  return result;
}
