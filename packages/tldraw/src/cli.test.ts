import { describe, expect, it, vi } from 'vitest';
import { runCli, type CliDependencies } from './cli';

describe('runCli', () => {
  it('prints the compact launcher help without indexing', async () => {
    const dependencies = {
      runCommand: vi.fn(),
      writeError: vi.fn(),
      writeOutput: vi.fn(),
    } satisfies CliDependencies;

    await expect(runCli(['--help'], dependencies)).resolves.toBe(0);
    expect(dependencies.runCommand).not.toHaveBeenCalled();
    expect(dependencies.writeOutput).toHaveBeenCalledWith(expect.stringContaining(
      'codegraphy-tldraw [PATH]',
    ));
  });
});
