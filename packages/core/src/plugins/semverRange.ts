import { compareSemver, parseSemver } from './semverParts';

export function satisfiesSemverRange(version: string, range: string): boolean {
  const target = parseSemver(version);
  if (!target) return false;

  const normalized = range.trim();
  if (/^\d+$/.test(normalized)) {
    return target.major === Number(normalized);
  }

  if (normalized.startsWith('^')) {
    const minimum = parseSemver(normalized.slice(1));
    if (!minimum) return false;
    const maximum = { major: minimum.major + 1, minor: 0, patch: 0 };
    return compareSemver(target, minimum) >= 0 && compareSemver(target, maximum) < 0;
  }

  const exact = parseSemver(normalized);
  return exact ? compareSemver(target, exact) === 0 : false;
}
