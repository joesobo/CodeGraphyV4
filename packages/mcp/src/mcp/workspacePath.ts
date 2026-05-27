import type { CodeGraphyMcpServerDependencies } from './contracts';

export function splitWorkspacePath(input: Record<string, unknown>): {
  workspacePath?: string;
  arguments: Record<string, unknown>;
} {
  const { path, ...args } = input;
  return {
    workspacePath: typeof path === 'string' ? path : undefined,
    arguments: args,
  };
}

export function resolveInputWorkspacePath(
  workspacePath: string | undefined,
  dependencies: CodeGraphyMcpServerDependencies,
): string {
  return workspacePath ?? dependencies.cwd();
}
