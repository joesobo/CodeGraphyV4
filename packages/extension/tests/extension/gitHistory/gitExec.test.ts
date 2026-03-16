import { describe, expect, it, vi } from 'vitest';
import { execGitCommand } from '../../../src/extension/gitHistory/gitExec';

describe('gitHistory/gitExec', () => {
  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController();
    const execFileImpl = vi.fn();

    controller.abort();

    await expect(
      execGitCommand(['status'], {
        workspaceRoot: '/workspace',
        signal: controller.signal,
        execFileImpl,
      })
    ).rejects.toMatchObject({
      message: 'Indexing aborted',
      name: 'AbortError',
    });
    expect(execFileImpl).not.toHaveBeenCalled();
  });

  it('resolves stdout from a successful git command', async () => {
    const execFileImpl = vi.fn((_cmd, _args, _options, callback) => {
      callback?.(null, 'main\n');
      return { kill: vi.fn() };
    });

    await expect(
      execGitCommand(['rev-parse', '--abbrev-ref', 'HEAD'], {
        workspaceRoot: '/workspace',
        execFileImpl: execFileImpl as never,
      })
    ).resolves.toBe('main\n');

    expect(execFileImpl).toHaveBeenCalledWith(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      { cwd: '/workspace', maxBuffer: 10 * 1024 * 1024 },
      expect.any(Function)
    );
  });

  it('rejects non-Error failures with the fallback message', async () => {
    const execFileImpl = vi.fn((_cmd, _args, _options, callback) => {
      callback?.('boom', '');
      return { kill: vi.fn() };
    });

    await expect(
      execGitCommand(['status'], {
        workspaceRoot: '/workspace',
        execFileImpl: execFileImpl as never,
      })
    ).rejects.toThrow('Git command failed');
  });

  it('kills the child process and rejects when the signal aborts mid-command', async () => {
    const controller = new AbortController();
    const kill = vi.fn();
    const execFileImpl = vi.fn(() => ({ kill }));

    const promise = execGitCommand(['status'], {
      workspaceRoot: '/workspace',
      signal: controller.signal,
      execFileImpl: execFileImpl as never,
    });

    controller.abort();

    await expect(promise).rejects.toMatchObject({
      message: 'Indexing aborted',
      name: 'AbortError',
    });
    expect(kill).toHaveBeenCalledTimes(1);
  });
});
