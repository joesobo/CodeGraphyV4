import { execFileSync } from 'child_process';

export function runCommand(command: string, args: string[], cwd: string): void {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}
