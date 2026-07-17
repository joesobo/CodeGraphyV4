import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/cli/run';

describe('cli/run', () => {
  it('writes successful output to stdout', async () => {
    const stdout = vi.fn();
    const stderr = vi.fn();

    await expect(runCli(['--version'], { stdout, stderr })).resolves.toBe(0);

    expect(stdout).toHaveBeenCalledWith(expect.stringMatching(/^\d+\.\d+\.\d+(?:[-+].+)?\n$/));
    expect(stderr).not.toHaveBeenCalled();
  });

  it('writes command errors to stderr', async () => {
    const stdout = vi.fn();
    const stderr = vi.fn();

    await expect(runCli(['wat'], { stdout, stderr })).resolves.toBe(2);

    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalledWith(
      '{"error":"invalid_arguments","message":"Unknown command: wat"}\n',
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
      '{"error":"command_failed","message":"database unavailable"}\n',
    );
  });
});
