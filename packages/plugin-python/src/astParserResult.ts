import type { ParsedPythonImport } from './pythonImportTypes';
import { normalizeParsedImport } from './astParserNormalize';

export function parsePythonImportsFromRaw(raw: string): ParsedPythonImport[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const imports: ParsedPythonImport[] = [];
  for (const item of parsed) {
    const normalized = normalizeParsedImport(item);
    if (normalized) {
      imports.push(normalized);
    }
  }

  return imports;
}
