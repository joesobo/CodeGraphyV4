import type { ParsedPythonImport } from './pythonImportTypes';
import { normalizeFromRecord } from './astFromRecordNormalizer';
import { normalizeImportRecord } from './astImportRecordNormalizer';

export function normalizeParsedImport(value: unknown): ParsedPythonImport | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const line = parseLineNumber(record.line);
  if (line === null) {
    return null;
  }

  if (record.kind === 'import') {
    return normalizeImportRecord(record, line);
  }

  if (record.kind === 'from') {
    return normalizeFromRecord(record, line);
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseLineNumber(rawLine: unknown): number | null {
  if (typeof rawLine !== 'number' || !Number.isFinite(rawLine)) {
    return null;
  }

  return rawLine;
}
