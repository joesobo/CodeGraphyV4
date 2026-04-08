import { join } from 'path';
import { toPosix } from '../shared/util/pathUtils';
import type {
  BoundaryToolPatterns,
  ResolvedBoundaryConfig,
  ResolvedToolPatterns,
  QualityToolPatterns,
} from './quality';

function normalizePatterns(patterns: string[] | undefined): string[] {
  return (patterns ?? []).map(toPosix);
}

export function mergeToolPatterns(
  defaults: QualityToolPatterns | undefined,
  overrides: QualityToolPatterns | undefined
): ResolvedToolPatterns {
  return {
    exclude: [...normalizePatterns(defaults?.exclude), ...normalizePatterns(overrides?.exclude)],
    include: [...normalizePatterns(defaults?.include), ...normalizePatterns(overrides?.include)]
  };
}

export function mergeBoundaryPatterns(
  defaults: BoundaryToolPatterns | undefined,
  overrides: BoundaryToolPatterns | undefined
): ResolvedBoundaryConfig {
  return {
    exclude: [...normalizePatterns(defaults?.exclude), ...normalizePatterns(overrides?.exclude)],
    include: [...normalizePatterns(defaults?.include), ...normalizePatterns(overrides?.include)],
    entrypoints: [
      ...normalizePatterns(defaults?.entrypoints),
      ...normalizePatterns(overrides?.entrypoints)
    ],
    layers: overrides?.layers ?? defaults?.layers ?? []
  };
}

export function packagePattern(packageName: string, pattern: string): string {
  return toPosix(join('packages', packageName, pattern));
}
