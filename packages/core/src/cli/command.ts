import { runIndexCommand } from './index/command';
import { createHelpResult } from './help/command';
import { runPluginsCommand } from './plugins/command';
import { runQueryCommand } from './query/command';
import { runSetupCommand } from './setup/command';
import { runStatusCommand } from './status/command';
import type { CliCommand } from './parse';
import { readCliVersion } from './version';
import { createDiagnosticEvent, formatDiagnosticEventLine } from '../diagnostics/events';

export interface CommandExecutionResult {
  exitCode: number;
  output: string;
}

export interface CliCommandDependencies {
  writeDiagnostic?(line: string): void;
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

  const writeDiagnostic = (line: string): void => {
    if (dependencies.writeDiagnostic) {
      dependencies.writeDiagnostic(line);
      return;
    }
    process.stderr.write(`${line}\n`);
  };
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
    ...(command.report ? { report: command.report } : {}),
    ...(command.workspacePath ? { workspacePath: command.workspacePath } : {}),
  };
}

export async function runCliCommand(
  command: CliCommand,
  dependencies: CliCommandDependencies = {},
): Promise<CommandExecutionResult> {
  if (command.parseError) {
    return {
      exitCode: 2,
      output: JSON.stringify({ error: 'invalid_arguments', message: command.parseError }),
    };
  }
  emitCliDiagnostic(command, dependencies, 'command-started', createCommandContext(command));
  let result: CommandExecutionResult;

  switch (command.name) {
    case 'setup':
      result = runSetupCommand();
      break;
    case 'status':
      result = runStatusCommand(command.workspacePath, undefined, {
        verbose: command.verbose,
        ...(dependencies.writeDiagnostic ? { writeDiagnostic: line => dependencies.writeDiagnostic?.(line) } : {}),
      });
      break;
    case 'index':
      result = await runIndexCommand(command.workspacePath, undefined, {
        verbose: command.verbose,
        ...(dependencies.writeDiagnostic ? { writeDiagnostic: line => dependencies.writeDiagnostic?.(line) } : {}),
      });
      break;
    case 'plugins':
      result = await runPluginsCommand(command);
      break;
    case 'query':
      result = await runQueryCommand(command, undefined, {
        verbose: command.verbose,
        ...(dependencies.writeDiagnostic ? { writeDiagnostic: line => dependencies.writeDiagnostic?.(line) } : {}),
      });
      break;
    case 'version':
      result = { exitCode: 0, output: readCliVersion() };
      break;
    case 'help':
    default:
      result = createHelpResult(command.helpPath);
  }

  emitCliDiagnostic(command, dependencies, 'command-completed', {
    command: command.name,
    ...(command.report ? { report: command.report } : {}),
    exitCode: result.exitCode,
  });

  return result;
}
