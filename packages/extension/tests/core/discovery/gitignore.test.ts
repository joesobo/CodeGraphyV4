import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadGitignore } from '../../../src/core/discovery/gitignore';

describe('gitignore', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-test-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns null without warning when the gitignore file is missing', () => {
    const warn = vi.fn();

    expect(loadGitignore(tempDir, warn)).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('loads gitignore patterns when the file exists', () => {
    fs.writeFileSync(path.join(tempDir, '.gitignore'), '*.log\n');

    const gitignore = loadGitignore(tempDir);

    expect(gitignore?.ignores('debug.log')).toBe(true);
    expect(gitignore?.ignores('app.ts')).toBe(false);
  });

  it('warns and returns null when reading the gitignore file fails', () => {
    const warningSpy = vi.fn();
    fs.mkdirSync(path.join(tempDir, '.gitignore'));

    expect(loadGitignore(tempDir, warningSpy)).toBeNull();
    expect(warningSpy).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to load .gitignore:',
      expect.any(Error)
    );
  });
});
