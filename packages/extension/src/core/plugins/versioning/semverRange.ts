/**
 * @fileoverview Semver range satisfaction check.
 * @module core/plugins/versioning/semverRange
 */

import { parseSemver, compareSemver } from './semver';
import type { ISemver } from './semver';

export function satisfiesSemverRange(version: string, range: string): boolean {
  const target = parseSemver(version);
  if (!target) return false;

  const normalized = range.trim();
  if (normalized.startsWith('^')) {
    const min = parseSemver(normalized.slice(1));
    if (!min) return false;
    const maxExclusive: ISemver = { major: min.major + 1, minor: 0, patch: 0 };
    return compareSemver(target, min) >= 0 && compareSemver(target, maxExclusive) < 0;
  }

  const exact = parseSemver(normalized);
  if (!exact) return false;
  return compareSemver(target, exact) === 0;
}
