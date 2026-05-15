import { spawnSync } from 'node:child_process';

export interface GlobalPackageRootCommandResult {
  status: number | null;
  stdout?: string | Buffer;
}

export type RunGlobalPackageRootCommand = (
  command: string,
  args: string[],
  options: { encoding: 'utf-8' },
) => GlobalPackageRootCommandResult;

function normalizeRootLines(stdout: string | Buffer | undefined): string[] {
  const text = Buffer.isBuffer(stdout) ? stdout.toString('utf-8') : stdout ?? '';
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

export function resolveNpmGlobalPackageRoots(
  runCommand: RunGlobalPackageRootCommand = spawnSync,
): string[] {
  const result = runCommand('npm', ['root', '-g'], { encoding: 'utf-8' });
  if (result.status !== 0) {
    return [];
  }

  return normalizeRootLines(result.stdout);
}
