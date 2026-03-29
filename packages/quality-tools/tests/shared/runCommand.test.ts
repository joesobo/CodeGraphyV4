import { describe, expect, it, vi } from 'vitest';
import { runCommand } from '../../src/shared/runCommand';
import * as childProcess from 'child_process';

vi.mock('child_process', () => ({
  execFileSync: vi.fn()
}));

describe('runCommand', () => {
  it('executes the command with inherited stdio', () => {
    runCommand('pnpm', ['test'], '/repo');
    expect(vi.mocked(childProcess.execFileSync)).toHaveBeenCalledWith(
      'pnpm',
      ['test'],
      { cwd: '/repo', stdio: 'inherit' }
    );
  });
});
