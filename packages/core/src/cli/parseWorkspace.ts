import type { CliCommand } from './parseTypes';

export function parseWorkspaceCommand(name: 'index' | 'status', argv: string[]): CliCommand {
  const [workspacePath, extra] = argv;
  if (workspacePath?.startsWith('-')) {
    return { name, parseError: `Unknown option for ${name}: ${workspacePath}` };
  }
  if (extra) {
    return { name, parseError: `Unexpected argument for ${name}: ${extra}` };
  }
  return workspacePath ? { name, workspacePath } : { name };
}
