import type { GodotProjectSetting } from './types';

const PROJECT_SECTION_REGEX = /^\[\s*([^\]]+)\s*\]$/;

export function parseGodotProjectSection(line: string): string | null {
  const sectionMatch = line.match(PROJECT_SECTION_REGEX);
  return sectionMatch ? sectionMatch[1].trim() : null;
}

export function parseGodotProjectSetting(
  line: string,
  lineNumber: number,
  section: string | null,
): GodotProjectSetting | null {
  const separatorIndex = line.indexOf('=');
  if (separatorIndex < 0) {
    return null;
  }

  const key = line.slice(0, separatorIndex).trim();
  const value = line.slice(separatorIndex + 1).trim();
  if (!key || !value) {
    return null;
  }

  return {
    line: lineNumber,
    section,
    key,
    value,
  };
}
