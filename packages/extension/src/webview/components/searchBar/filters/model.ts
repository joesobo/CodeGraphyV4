import { postMessage } from '../../../vscodeApi';

export interface FilterPatternSources {
  disabledCustomPatterns: readonly string[];
  disabledPluginPatterns: readonly string[];
  customPatterns: readonly string[];
  pluginPatterns: readonly string[];
}

export function normalizeFilterPattern(value: string): string {
  return value.trim();
}

export function canAddFilterPattern(value: string): boolean {
  return normalizeFilterPattern(value).length > 0;
}

export function toFilterGlob(path: string): string {
  const normalized = normalizeFilterPattern(path).replace(/^\/+/, '');
  if (!normalized) {
    return '';
  }

  return normalized.startsWith('**/') ? normalized : `**/${normalized}`;
}

export function getEnabledFilterPatterns({
  disabledCustomPatterns,
  disabledPluginPatterns,
  customPatterns,
  pluginPatterns,
}: FilterPatternSources): string[] {
  const disabledCustom = new Set(disabledCustomPatterns);
  const disabledPlugin = new Set(disabledPluginPatterns);

  return [
    ...pluginPatterns.filter(pattern => !disabledPlugin.has(pattern)),
    ...customPatterns.filter(pattern => !disabledCustom.has(pattern)),
  ];
}

export function getEnabledFilterCount(sources: FilterPatternSources): number {
  return getEnabledFilterPatterns(sources).length;
}

export function addFilterPatterns(
  currentPatterns: readonly string[],
  nextPatterns: readonly string[],
): string[] {
  const normalized = nextPatterns
    .map(normalizeFilterPattern)
    .filter(Boolean);

  return Array.from(new Set([...currentPatterns, ...normalized]));
}

export function filterPatternsEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

export function removeFilterPattern(
  currentPatterns: readonly string[],
  pattern: string,
): string[] {
  return currentPatterns.filter((entry) => entry !== pattern);
}

export function editFilterPattern(
  currentPatterns: readonly string[],
  previousPattern: string,
  nextPattern: string,
): string[] {
  const normalizedPattern = normalizeFilterPattern(nextPattern);
  if (!normalizedPattern || normalizedPattern === previousPattern) {
    return [...currentPatterns];
  }

  return currentPatterns.map((entry) => (entry === previousPattern ? normalizedPattern : entry));
}

export function commitFilterPatterns(patterns: string[]): void {
  postMessage({ type: 'UPDATE_FILTER_PATTERNS', payload: { patterns } });
}

export function getDisabledFilterPatterns(
  currentPatterns: readonly string[],
  pattern: string,
  enabled: boolean,
): string[] {
  const current = new Set(currentPatterns);
  if (enabled) {
    current.delete(pattern);
  } else {
    current.add(pattern);
  }

  return Array.from(current);
}

export function commitFilterPatternState(
  source: 'custom' | 'plugin',
  pattern: string,
  enabled: boolean,
): void {
  postMessage({ type: 'UPDATE_FILTER_PATTERN_STATE', payload: { source, pattern, enabled } });
}

export function commitFilterPatternGroupState(
  source: 'custom' | 'plugin',
  enabled: boolean,
): void {
  postMessage({ type: 'UPDATE_FILTER_PATTERN_GROUP_STATE', payload: { source, enabled } });
}
