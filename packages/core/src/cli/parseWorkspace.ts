import type { CliCommand } from './parseTypes';

export function parseWorkspaceCommand(
  name: 'batch' | 'doctor' | 'filter' | 'index' | 'scope' | 'status',
  argv: string[],
): CliCommand {
  const [extra] = argv;
  return extra
    ? { name, parseError: `Unexpected argument for ${name}: ${extra}` }
    : { name };
}
