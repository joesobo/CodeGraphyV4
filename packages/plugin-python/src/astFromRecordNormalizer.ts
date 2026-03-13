import type { ParsedPythonImport } from './pythonImportTypes';

export function normalizeFromRecord(
  record: Record<string, unknown>,
  line: number,
): Extract<ParsedPythonImport, { kind: 'from' }> | null {
  const module = record.module;
  const names = record.names;
  const level = record.level;

  if (typeof module !== 'string') {
    return null;
  }

  if (!Array.isArray(names) || !names.every(name => typeof name === 'string')) {
    return null;
  }

  if (typeof level !== 'number' || !Number.isInteger(level) || level < 0) {
    return null;
  }

  return {
    kind: 'from',
    module,
    names,
    level,
    line,
  };
}
