import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { runSetupCommand } from '../../../src/cli/setup/command';

describe('setup/command', () => {
  it('prepares only the CodeGraphy user directory', () => {
    const ensureDirectory = vi.fn();
    const result = runSetupCommand({
      ensureDirectory,
      homeDir: () => '/user/home',
    });

    const codegraphyDirectory = path.join('/user/home', '.codegraphy');

    expect(ensureDirectory).toHaveBeenCalledWith(codegraphyDirectory);
    expect(result).toEqual({
      exitCode: 0,
      output: `Prepared CodeGraphy user directory at ${codegraphyDirectory}.`,
    });
  });
});
