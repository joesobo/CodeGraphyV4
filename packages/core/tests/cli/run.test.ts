import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/cli/run';

describe('cli/run', () => {
  it('wraps successful data commands in the stable JSON envelope', async () => {
    const stdout = vi.fn();
    const stderr = vi.fn();

    await expect(runCli(['nodes'], {
      runCommand: async () => ({
        exitCode: 0,
        output: '{"nodes":[],"page":{"returned":0}}',
      }),
      stdout,
      stderr,
    })).resolves.toBe(0);

    expect(stdout).toHaveBeenCalledWith(
      '{"ok":true,"command":"nodes","data":{"nodes":[],"page":{"returned":0}}}\n',
    );
    expect(stderr).not.toHaveBeenCalled();
  });

  it('writes successful output to stdout', async () => {
    const stdout = vi.fn();
    const stderr = vi.fn();

    await expect(runCli(['--version'], {
      runCommand: async () => ({ exitCode: 0, output: '3.0.0' }),
      stdout,
      stderr,
    })).resolves.toBe(0);

    expect(stdout).toHaveBeenCalledWith(expect.stringMatching(/^\d+\.\d+\.\d+(?:[-+].+)?\n$/));
    expect(stderr).not.toHaveBeenCalled();
  });

  it('writes command errors to stderr', async () => {
    const stdout = vi.fn();
    const stderr = vi.fn();

    await expect(runCli(['wat'], { stdout, stderr })).resolves.toBe(2);

    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalledWith(
      '{"ok":false,"command":"help","error":{"code":"invalid_arguments","message":"Unknown command: wat"}}\n',
    );
  });

  it('returns a concise operational error when execution throws', async () => {
    const stdout = vi.fn();
    const stderr = vi.fn();

    await expect(runCli(['index'], {
      runCommand: async () => {
        throw new Error('database unavailable');
      },
      stdout,
      stderr,
    })).resolves.toBe(1);

    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalledWith(
      '{"ok":false,"command":"index","error":{"code":"command_failed","message":"database unavailable"}}\n',
    );
  });
});
