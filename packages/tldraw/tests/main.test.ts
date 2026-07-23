import { afterEach, describe, expect, it, vi } from 'vitest';

const { runCli } = vi.hoisted(() => ({
  runCli: vi.fn<() => Promise<number>>(),
}));

vi.mock('../src/cli', () => ({ runCli }));

const originalArguments = process.argv;
const originalExitCode = process.exitCode;

afterEach(() => {
  process.argv = originalArguments;
  process.exitCode = originalExitCode;
  runCli.mockReset();
  vi.resetModules();
});

describe('codegraphy-tldraw executable', () => {
  it('passes command arguments to the CLI and uses its exit code', async () => {
    process.argv = ['node', 'codegraphy-tldraw', '--help'];
    runCli.mockResolvedValue(0);

    await import('../src/main');

    expect(runCli).toHaveBeenCalledWith(['--help']);
    expect(process.exitCode).toBe(0);
  });
});
