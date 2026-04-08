import { readFileSync } from 'fs';
import { join, matchesGlob } from 'path';
import { mergeBoundaryPatterns, mergeToolPatterns, packagePattern } from './patterns';
import { toPosix } from '../shared/util/pathUtils';

export type QualityToolName = 'boundaries' | 'crap' | 'mutation' | 'scrap' | 'organize';

export interface QualityToolPatterns {
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
