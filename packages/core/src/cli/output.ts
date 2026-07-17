import type { CommandExecutionResult } from './command';
import { parseCliOutput, readCliError } from './outputValue';
import type { CliCommand } from './parseTypes';

function commandName(command: CliCommand): string {
  return command.report ?? command.name;
}

export function formatCliResult(command: CliCommand, result: CommandExecutionResult): string {
  if ((command.name === 'help' || command.name === 'version') && result.exitCode === 0) {
    return result.output;
  }
  const output = parseCliOutput(result.output);
  if (result.exitCode === 0) {
    return JSON.stringify({ ok: true, command: commandName(command), data: output });
  }
  if (command.name === 'doctor' && typeof output === 'object' && output !== null) {
    return JSON.stringify({
      ok: false,
      command: commandName(command),
      data: output,
      error: {
        code: 'workspace_unhealthy',
        message: 'Workspace checks failed.',
        action: 'Review the failed checks and run their suggested actions.',
      },
    });
  }
  return JSON.stringify({ ok: false, command: commandName(command), error: readCliError(output) });
}
