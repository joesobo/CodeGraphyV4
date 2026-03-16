export const CORE_PLUGIN_API_VERSION = '2.0.0';
export const WEBVIEW_PLUGIN_API_VERSION = '1.0.0';

export interface ISemver {
  major: number;
  minor: number;
  patch: number;
}

export function parseSemver(input: string): ISemver | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(input.trim());
  if (!match) return undefined;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function compareSemver(left: ISemver, right: ISemver): number {
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

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
