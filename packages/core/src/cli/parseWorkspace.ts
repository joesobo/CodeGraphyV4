import type { CliCommand } from './parseTypes';

export function parseWorkspaceCommand(name: 'index' | 'status', argv: string[]): CliCommand {
  const [workspacePath] = argv;
  return workspacePath ? { name, workspacePath } : { name };
}
