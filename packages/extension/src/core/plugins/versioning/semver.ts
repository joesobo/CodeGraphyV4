/**
 * @fileoverview Semver parsing and comparison utilities.
 * @module core/plugins/versioning/semver
 */

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
