import * as childProcess from 'child_process';

export function runCommand(
  command: string,
  args: string[],
  cwd: string,
  env?: Record<string, string>,
): void {
  childProcess.execFileSync(command, args, {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    stdio: 'inherit',
  });
}
