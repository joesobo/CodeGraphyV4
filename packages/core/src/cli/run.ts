import { runCliCommand, type CommandExecutionResult } from './command';
import { parseCliCommand } from './parse';
import type { CliCommand } from './parseTypes';

export interface RunCliDependencies {
  runCommand(command: CliCommand): Promise<CommandExecutionResult>;
  stdout(output: string): void;
  stderr(output: string): void;
}

const DEFAULT_DEPENDENCIES: RunCliDependencies = {
  runCommand: command => runCliCommand(command),
  stdout: output => process.stdout.write(output),
  stderr: output => process.stderr.write(output),
};

interface CliError {
  action?: string;
  code: string;
  message: string;
}

interface ParsedOutput {
  action?: unknown;
  error?: unknown;
  message?: unknown;
  [key: string]: unknown;
}

function commandName(command: CliCommand): string {
  return command.report ?? command.name;
}

function parseOutput(output: string): unknown {
  try {
    return JSON.parse(output);
  } catch {
    return output;
  }
}

function errorFrom(output: unknown): CliError {
  if (typeof output !== 'object' || output === null) {
    return { code: 'command_failed', message: String(output) };
  }
  const parsed = output as ParsedOutput;
  const code = typeof parsed.error === 'string' ? parsed.error : 'command_failed';
  const message = typeof parsed.message === 'string' ? parsed.message : 'Command failed.';
  return {
    code,
    message,
    ...(typeof parsed.action === 'string' ? { action: parsed.action } : {}),
  };
}

function formatResult(command: CliCommand, result: CommandExecutionResult): string {
  if ((command.name === 'help' || command.name === 'version') && result.exitCode === 0) {
    return result.output;
  }
  const output = parseOutput(result.output);
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
  return JSON.stringify({ ok: false, command: commandName(command), error: errorFrom(output) });
}

export async function runCli(
  argv: string[],
  dependencies: Partial<RunCliDependencies> = {},
): Promise<number> {
  const io = { ...DEFAULT_DEPENDENCIES, ...dependencies };
  const command = parseCliCommand(argv);
  let result: CommandExecutionResult;
  try {
    result = await io.runCommand(command);
  } catch (error) {
    result = {
      exitCode: 1,
      output: JSON.stringify({
        error: 'command_failed',
        message: error instanceof Error ? error.message : String(error),
      }),
    };
  }

  if (result.output) {
    const write = result.exitCode === 0 ? io.stdout : io.stderr;
    write(`${formatResult(command, result)}\n`);
  }

  return result.exitCode;
}
