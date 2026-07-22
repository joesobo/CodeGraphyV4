import type { CommandExecutionResult } from '../command';
import type { CliCommand } from '../parseTypes';
import { parseCliOutput, readCliError } from './parser';

function commandName(command: CliCommand): string {
  return command.invokedCommand ?? command.report ?? command.name;
}

function isDoctorChecksOutput(output: unknown): output is { healthy: boolean; checks: object } {
  if (typeof output !== 'object' || output === null) return false;
  const candidate = output as { healthy?: unknown; checks?: unknown };
  return typeof candidate.healthy === 'boolean'
    && typeof candidate.checks === 'object'
    && candidate.checks !== null;
}

export function formatCliResult(command: CliCommand, result: CommandExecutionResult): string {
  if ((command.name === 'help' || command.name === 'version') && result.exitCode === 0) {
    return result.output;
  }
  const output = parseCliOutput(result.output);
  if (result.exitCode === 0) {
    return JSON.stringify({ ok: true, command: commandName(command), data: output });
  }
  if (command.name === 'doctor' && isDoctorChecksOutput(output)) {
    return JSON.stringify({
      ok: false,
      command: commandName(command),
      error: {
        code: 'workspace_unhealthy',
        message: 'Workspace checks failed.',
        action: 'Review the failed checks and run their suggested actions.',
        details: output,
      },
    });
  }
  return JSON.stringify({ ok: false, command: commandName(command), error: readCliError(output) });
}
