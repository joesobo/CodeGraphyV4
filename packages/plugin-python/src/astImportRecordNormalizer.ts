import type { ParsedPythonImport } from './pythonImportTypes';

export function normalizeImportRecord(
  record: Record<string, unknown>,
  line: number,
): Extract<ParsedPythonImport, { kind: 'import' }> | null {
  const module = record.module;
  if (typeof module !== 'string' || module.length === 0) {
    return null;
  }

  return {
    kind: 'import',
    module,
    line,
  };
}
