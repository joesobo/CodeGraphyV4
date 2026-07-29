import type { CliCommand } from './protocol';

export function parseWorkspaceCommand(
  name: 'doctor' | 'filter' | 'index' | 'scope' | 'status' | 'watch',
  argv: string[],
): CliCommand {
  const [extra] = argv;
  return extra
    ? { name, parseError: `Unexpected argument for ${name}: ${extra}` }
    : { name };
}
