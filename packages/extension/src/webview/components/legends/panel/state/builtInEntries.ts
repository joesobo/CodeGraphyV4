import type { LegendBuiltInEntry } from '../section/contracts';

export function createBuiltInEntries(
  types: Array<{ id: string; label: string; defaultColor: string }>,
  colors: Record<string, string>,
): LegendBuiltInEntry[] {
  return types.map((entry) => ({
    id: entry.id,
    label: entry.label,
    color: colors[entry.id] ?? entry.defaultColor,
    defaultColor: entry.defaultColor,
  }));
}
