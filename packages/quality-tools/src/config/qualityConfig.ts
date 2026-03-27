import { readFileSync } from 'fs';
import { join, matchesGlob } from 'path';
import { toPosix } from '../shared/pathUtils';

export type QualityToolName = 'crap' | 'mutation' | 'scrap';

interface QualityToolPatterns {
  exclude?: string[];
  include?: string[];
}

interface QualityConfigBlock {
  crap?: QualityToolPatterns;
  mutation?: QualityToolPatterns;
  scrap?: QualityToolPatterns;
}

interface QualityConfig {
  defaults?: QualityConfigBlock;
  packages?: Record<string, QualityConfigBlock>;
}

export interface ResolvedToolPatterns {
  exclude: string[];
  include: string[];
}

const CONFIG_FILE = 'quality.config.json';

function normalizePatterns(patterns: string[] | undefined): string[] {
  return (patterns ?? []).map(toPosix);
}

function mergeToolPatterns(
  defaults: QualityToolPatterns | undefined,
  overrides: QualityToolPatterns | undefined
): ResolvedToolPatterns {
  return {
    exclude: [...normalizePatterns(defaults?.exclude), ...normalizePatterns(overrides?.exclude)],
    include: [...normalizePatterns(defaults?.include), ...normalizePatterns(overrides?.include)]
  };
}

function packagePattern(packageName: string, pattern: string): string {
  return toPosix(join('packages', packageName, pattern));
}

export function loadQualityConfig(repoRoot: string): QualityConfig {
  const configPath = join(repoRoot, CONFIG_FILE);

  try {
    return JSON.parse(readFileSync(configPath, 'utf-8')) as QualityConfig;
  } catch {
    return {};
  }
}

export function resolvePackageToolPatterns(
  repoRoot: string,
  packageName: string,
  toolName: QualityToolName
): ResolvedToolPatterns {
  const config = loadQualityConfig(repoRoot);
  return mergeToolPatterns(config.defaults?.[toolName], config.packages?.[packageName]?.[toolName]);
}

export function resolvePackageToolGlobs(
  repoRoot: string,
  packageName: string,
  toolName: QualityToolName
): ResolvedToolPatterns {
  const patterns = resolvePackageToolPatterns(repoRoot, packageName, toolName);

  return {
    exclude: patterns.exclude.map((pattern) => packagePattern(packageName, pattern)),
    include: patterns.include.map((pattern) => packagePattern(packageName, pattern))
  };
}

export function pathIncludedByTool(
  repoRoot: string,
  packageName: string,
  toolName: QualityToolName,
  packageRelativePath: string
): boolean {
  const patterns = resolvePackageToolPatterns(repoRoot, packageName, toolName);
  const normalizedPath = toPosix(packageRelativePath);
  const included = patterns.include.length === 0 || patterns.include.some((pattern) => (
    matchesGlob(normalizedPath, pattern)
  ));
  const excluded = patterns.exclude.some((pattern) => matchesGlob(normalizedPath, pattern));
  return included && !excluded;
}
