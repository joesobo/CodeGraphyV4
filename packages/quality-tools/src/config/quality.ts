import { readFileSync } from 'fs';
import { join, matchesGlob } from 'path';
import { toPosix } from '../shared/util/pathUtils';

export type QualityToolName = 'boundaries' | 'crap' | 'mutation' | 'scrap' | 'organize';

interface QualityToolPatterns {
  exclude?: string[];
  include?: string[];
}

export interface BoundaryLayerRule {
  allow: string[];
  include: string[];
  name: string;
}

export interface BoundaryToolPatterns extends QualityToolPatterns {
  entrypoints?: string[];
  layers?: BoundaryLayerRule[];
}

interface QualityConfigBlock {
  boundaries?: BoundaryToolPatterns;
  crap?: QualityToolPatterns;
  mutation?: QualityToolPatterns;
  scrap?: QualityToolPatterns;
  organize?: QualityToolPatterns;
}

interface QualityConfig {
  defaults?: QualityConfigBlock;
  packages?: Record<string, QualityConfigBlock>;
}

export interface ResolvedToolPatterns {
  exclude: string[];
  include: string[];
}

export interface ResolvedBoundaryConfig extends ResolvedToolPatterns {
  entrypoints: string[];
  layers: BoundaryLayerRule[];
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

function mergeBoundaryPatterns(
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

export function resolvePackageBoundaryConfig(
  repoRoot: string,
  packageName: string
): ResolvedBoundaryConfig {
  const config = loadQualityConfig(repoRoot);
  return mergeBoundaryPatterns(config.defaults?.boundaries, config.packages?.[packageName]?.boundaries);
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
