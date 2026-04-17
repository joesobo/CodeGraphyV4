import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  SETTINGS_DIR_NAME,
  SETTINGS_FILE_NAME,
  ensureGitIgnoreContainsCodeGraphyEntry,
} from '../../../../../src/extension/repoSettings/store/persistence/files';

function createTempFilePath(name: string): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-gitignore-')), name);
}

describe('extension/repoSettings/store/persistence/files', () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    for (const directory of tempDirectories.splice(0)) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('exports the repo-local settings directory and file names', () => {
    expect(SETTINGS_DIR_NAME).toBe('.codegraphy');
    expect(SETTINGS_FILE_NAME).toBe('settings.json');
  });

  it('creates a new gitignore entry when the file is missing', () => {
    const gitIgnorePath = createTempFilePath('.gitignore');
    tempDirectories.push(path.dirname(gitIgnorePath));

    ensureGitIgnoreContainsCodeGraphyEntry(gitIgnorePath);

    expect(fs.readFileSync(gitIgnorePath, 'utf8')).toBe('.codegraphy/\n');
  });

  it('appends the entry to an empty gitignore without a leading blank line', () => {
    const gitIgnorePath = createTempFilePath('empty.gitignore');
    tempDirectories.push(path.dirname(gitIgnorePath));
    fs.writeFileSync(gitIgnorePath, '', 'utf8');

    ensureGitIgnoreContainsCodeGraphyEntry(gitIgnorePath);

    expect(fs.readFileSync(gitIgnorePath, 'utf8')).toBe('.codegraphy/\n');
  });

  it('appends the repo-local entry once and preserves existing newline state', () => {
    const gitIgnorePath = createTempFilePath('.gitignore');
    tempDirectories.push(path.dirname(gitIgnorePath));
    fs.writeFileSync(gitIgnorePath, 'dist\ncoverage', 'utf8');

    ensureGitIgnoreContainsCodeGraphyEntry(gitIgnorePath);
    ensureGitIgnoreContainsCodeGraphyEntry(gitIgnorePath);

    expect(fs.readFileSync(gitIgnorePath, 'utf8')).toBe('dist\ncoverage\n.codegraphy/\n');
  });

  it('treats both .codegraphy and .codegraphy/ as existing entries', () => {
    const barePath = createTempFilePath('bare.gitignore');
    const suffixedPath = createTempFilePath('suffixed.gitignore');
    tempDirectories.push(path.dirname(barePath));
    tempDirectories.push(path.dirname(suffixedPath));
    fs.writeFileSync(barePath, '.codegraphy\n', 'utf8');
    fs.writeFileSync(suffixedPath, '.codegraphy/\n', 'utf8');

    ensureGitIgnoreContainsCodeGraphyEntry(barePath);
    ensureGitIgnoreContainsCodeGraphyEntry(suffixedPath);

    expect(fs.readFileSync(barePath, 'utf8')).toBe('.codegraphy\n');
    expect(fs.readFileSync(suffixedPath, 'utf8')).toBe('.codegraphy/\n');
  });

  it('treats whitespace-padded existing entries as already present', () => {
    const gitIgnorePath = createTempFilePath('spaced.gitignore');
    tempDirectories.push(path.dirname(gitIgnorePath));
    fs.writeFileSync(gitIgnorePath, 'dist\n   .codegraphy/   \n\n', 'utf8');

    ensureGitIgnoreContainsCodeGraphyEntry(gitIgnorePath);

    expect(fs.readFileSync(gitIgnorePath, 'utf8')).toBe('dist\n   .codegraphy/   \n\n');
  });
});
