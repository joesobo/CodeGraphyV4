import * as fs from 'node:fs';

export const SETTINGS_DIR_NAME = '.codegraphy';
export const SETTINGS_FILE_NAME = 'settings.json';
const SETTINGS_IGNORE_ENTRY = '.codegraphy/';

export function ensureGitIgnoreContainsCodeGraphyEntry(gitIgnorePath: string): void {
  if (!fs.existsSync(gitIgnorePath)) {
    fs.writeFileSync(gitIgnorePath, `${SETTINGS_IGNORE_ENTRY}\n`);
    return;
  }

  const existing = fs.readFileSync(gitIgnorePath, 'utf8');
  const lines = existing
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.some(line => line === '.codegraphy' || line === SETTINGS_IGNORE_ENTRY)) {
    return;
  }

  const suffix = existing.endsWith('\n') || existing.length === 0 ? '' : '\n';
  fs.writeFileSync(gitIgnorePath, `${existing}${suffix}${SETTINGS_IGNORE_ENTRY}\n`);
}
