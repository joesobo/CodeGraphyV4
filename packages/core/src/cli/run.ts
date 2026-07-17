import { runCliCommand, type CommandExecutionResult } from './command';
import { parseCliCommand } from './parse';
import type { CliCommand } from './parseTypes';
import { formatCliResult } from './output';

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
    write(`${formatCliResult(command, result)}\n`);
  }

  return result.exitCode;
}
