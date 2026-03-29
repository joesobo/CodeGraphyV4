import * as childProcess from 'child_process';

export function runCommand(command: string, args: string[], cwd: string): void {
  childProcess.execFileSync(command, args, { cwd, stdio: 'inherit' });
}
