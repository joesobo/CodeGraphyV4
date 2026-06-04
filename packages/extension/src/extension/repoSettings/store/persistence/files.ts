import * as fs from 'node:fs';

export const SETTINGS_DIR_NAME = '.codegraphy';
export const SETTINGS_FILE_NAME = 'settings.json';
const SETTINGS_IGNORE_ENTRY = '.codegraphy/*';
const LEGACY_SETTINGS_IGNORE_ENTRIES = new Set(['.codegraphy', '.codegraphy/']);

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

  if (lines.includes(SETTINGS_IGNORE_ENTRY)) {
    return;
  }

  if (lines.some(line => LEGACY_SETTINGS_IGNORE_ENTRIES.has(line))) {
    fs.writeFileSync(
      gitIgnorePath,
      existing.replace(/(^|\r?\n)([ \t]*)\.codegraphy\/?([ \t]*)(?=\r?\n|$)/, `$1$2${SETTINGS_IGNORE_ENTRY}$3`),
    );
    return;
  }

  const suffix = existing.endsWith('\n') || existing.length === 0 ? '' : '\n';
  fs.writeFileSync(gitIgnorePath, `${existing}${suffix}${SETTINGS_IGNORE_ENTRY}\n`);
}
