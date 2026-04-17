import { isPlainObject } from './plainObject';

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function normalizePersistedFilterPatterns(normalized: Record<string, unknown>): void {
  const filterPatterns = readStringArray(normalized.filterPatterns);
  if (filterPatterns.length > 0) {
    normalized.filterPatterns = Array.from(new Set(filterPatterns));
  }

  delete normalized.exclude;
}

function normalizePersistedLegend(normalized: Record<string, unknown>): void {
  if (
    Array.isArray(normalized.groups)
    && (!Array.isArray(normalized.legend) || normalized.legend.length === 0)
  ) {
    normalized.legend = normalized.groups;
  }
}

function normalizePersistedNodeColors(normalized: Record<string, unknown>): void {
  const nodeColors = isPlainObject(normalized.nodeColors)
    ? { ...normalized.nodeColors }
    : {};
  if (typeof normalized.folderNodeColor === 'string' && !('folder' in nodeColors)) {
    nodeColors.folder = normalized.folderNodeColor;
  }
  if (Object.keys(nodeColors).length > 0) {
    normalized.nodeColors = nodeColors;
  }
}

export function normalizePersistedSettingsShape(
  value: unknown,
): Record<string, unknown> {
  if (!isPlainObject(value)) {
    return {};
  }

  const normalized: Record<string, unknown> = { ...value };
  normalizePersistedFilterPatterns(normalized);
  normalizePersistedLegend(normalized);
  normalizePersistedNodeColors(normalized);
  return normalized;
}
