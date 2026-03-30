import { describe, expect, it, vi } from 'vitest';
import { execGitCommand } from '../../../src/extension/gitHistory/exec';

type ExecFileLike = typeof import('node:child_process').execFile;

describe('gitHistory/exec', () => {
  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController();
    const execFileImpl = Object.assign(vi.fn(), { __promisify__: vi.fn() }) as unknown as ExecFileLike;

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
    const execFileImpl = Object.assign(
      vi.fn((_cmd, _args, _options, callback) => {
        callback?.(null, 'main\n');
        return { kill: vi.fn() };
      }),
      { __promisify__: vi.fn() },
    ) as unknown as ExecFileLike;

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
    const execFileImpl = Object.assign(
      vi.fn((_cmd, _args, _options, callback) => {
        callback?.('boom', '');
        return { kill: vi.fn() };
      }),
      { __promisify__: vi.fn() },
    ) as unknown as ExecFileLike;

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
    const execFileImpl = Object.assign(vi.fn(() => ({ kill })), {
      __promisify__: vi.fn(),
    }) as unknown as ExecFileLike;

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

  it('registers the abort listener with once and removes the same listener after success', async () => {
    const controller = new AbortController();
    const addEventListenerSpy = vi.spyOn(controller.signal, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(controller.signal, 'removeEventListener');
    let callback: ((error: Error | null, stdout: string) => void) | undefined;
    const execFileImpl = Object.assign(
      vi.fn((_cmd, _args, _options, execCallback) => {
        callback = execCallback;
        return { kill: vi.fn() };
      }),
      { __promisify__: vi.fn() },
    ) as unknown as ExecFileLike;

    const promise = execGitCommand(['status'], {
      workspaceRoot: '/workspace',
      signal: controller.signal,
      execFileImpl: execFileImpl as never,
    });

    expect(addEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function), { once: true });

    const abortListener = addEventListenerSpy.mock.calls[0]?.[1];
    callback?.(null, 'done\n');

    await expect(promise).resolves.toBe('done\n');
    expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', abortListener);
  });

  it('ignores later aborts once the command has already resolved', async () => {
    const controller = new AbortController();
    const kill = vi.fn();
    const execFileImpl = Object.assign(
      vi.fn((_cmd, _args, _options, callback) => {
        callback?.(null, 'done\n');
        return { kill };
      }),
      { __promisify__: vi.fn() },
    ) as unknown as ExecFileLike;

    const result = await execGitCommand(['status'], {
      workspaceRoot: '/workspace',
      signal: controller.signal,
      execFileImpl: execFileImpl as never,
    });

    controller.abort();

    expect(result).toBe('done\n');
    expect(kill).not.toHaveBeenCalled();
  });

  it('ignores a late git callback after abort already settled the promise', async () => {
    const controller = new AbortController();
    const kill = vi.fn();
    const removeEventListenerSpy = vi.spyOn(controller.signal, 'removeEventListener');
    let callback: ((error: Error | null, stdout: string) => void) | undefined;
    const execFileImpl = Object.assign(
      vi.fn((_cmd, _args, _options, execCallback) => {
        callback = execCallback;
        return { kill };
      }),
      { __promisify__: vi.fn() },
    ) as unknown as ExecFileLike;

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

    callback?.(new Error('late failure'), 'late stdout');

    expect(kill).toHaveBeenCalledTimes(1);
    expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
  });
});
