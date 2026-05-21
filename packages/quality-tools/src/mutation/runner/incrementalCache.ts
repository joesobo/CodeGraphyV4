import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve, sep } from 'path';
import { type QualityTarget } from '../../shared/resolve/target';

interface CachedMutationFile {
  mutants?: Array<{
    status?: string;
  }>;
  source?: string;
}

interface CachedTestFile {
  source?: string;
}

interface CachedMutationReport {
  files?: Record<string, CachedMutationFile>;
  testFiles?: Record<string, CachedTestFile>;
}

export interface ReusableMutationReport {
  mutantCount: number;
  mutationScore: number;
}

const DETECTED_MUTANT_STATUSES = new Set(['Killed', 'Timeout']);
const UNSCORED_MUTANT_STATUSES = new Set(['Ignored']);

function readCurrentSource(repoRoot: string, relativePath: string): string | undefined {
  const absolutePath = join(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    return undefined;
  }

  return readFileSync(absolutePath, 'utf8');
}

function escapeRegex(value: string): string {
  return value.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

function globPatternToRegExp(pattern: string): RegExp {
  let regex = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];

    if (char === '*' && next === '*') {
      const afterGlobstar = pattern[index + 2];
      if (afterGlobstar === '/') {
        regex += '(?:.*/)?';
        index += 2;
      } else {
        regex += '.*';
        index += 1;
      }
      continue;
    }

    if (char === '*') {
      regex += '[^/]*';
      continue;
    }

    if (char === '?') {
      regex += '[^/]';
      continue;
    }

    if (char === '{') {
      const end = pattern.indexOf('}', index + 1);
      if (end !== -1) {
        const choices = pattern
          .slice(index + 1, end)
          .split(',')
          .map(escapeRegex)
          .join('|');
        regex += `(?:${choices})`;
        index = end;
        continue;
      }
    }

    regex += escapeRegex(char);
  }

  return new RegExp(`${regex}$`);
}

function listFiles(directory: string, repoRoot: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = join(directory, entry);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      return listFiles(absolutePath, repoRoot);
    }

    return [relative(repoRoot, absolutePath).split(sep).join('/')];
  });
}

function currentScopedTestFiles(repoRoot: string, target: QualityTarget, scopedTestPatterns: readonly string[]): string[] {
  if (!target.packageName || scopedTestPatterns.length === 0) {
    return [];
  }

  const includePatterns = scopedTestPatterns.filter((pattern) => !pattern.startsWith('!'));
  const excludePatterns = scopedTestPatterns
    .filter((pattern) => pattern.startsWith('!'))
    .map((pattern) => pattern.slice(1));
  const includeMatchers = includePatterns.map(globPatternToRegExp);
  const excludeMatchers = excludePatterns.map(globPatternToRegExp);
  const testRoot = join(repoRoot, 'packages', target.packageName, 'tests');

  return listFiles(testRoot, repoRoot)
    .filter((relativePath) => includeMatchers.some((matcher) => matcher.test(relativePath)))
    .filter((relativePath) => !excludeMatchers.some((matcher) => matcher.test(relativePath)))
    .sort();
}

function sameValues(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sourceMatches(repoRoot: string, relativePath: string, cachedSource: string | undefined): boolean {
  return cachedSource !== undefined && readCurrentSource(repoRoot, relativePath) === cachedSource;
}

function mutationScore(mutants: Array<{ status?: string }>): number {
  const scoredMutants = mutants.filter((mutant) => !UNSCORED_MUTANT_STATUSES.has(mutant.status ?? ''));
  if (scoredMutants.length === 0) {
    return 100;
  }

  const detectedMutants = scoredMutants.filter((mutant) => DETECTED_MUTANT_STATUSES.has(mutant.status ?? ''));
  return (detectedMutants.length / scoredMutants.length) * 100;
}

export function readReusableMutationReport(
  repoRoot: string,
  target: QualityTarget,
  reportPath: string,
  scopedTestPatterns: readonly string[],
): ReusableMutationReport | undefined {
  const absoluteReportPath = resolve(repoRoot, reportPath);
  if (target.kind !== 'file' || !existsSync(absoluteReportPath)) {
    return undefined;
  }

  const report = JSON.parse(readFileSync(absoluteReportPath, 'utf8')) as CachedMutationReport;
  const cachedFile = report.files?.[target.relativePath];
  if (!cachedFile || !sourceMatches(repoRoot, target.relativePath, cachedFile.source)) {
    return undefined;
  }

  const cachedTests = Object.entries(report.testFiles ?? {});
  if (cachedTests.length === 0) {
    return undefined;
  }
  const cachedTestFiles = cachedTests.map(([relativePath]) => relativePath).sort();
  const currentTestFiles = currentScopedTestFiles(repoRoot, target, scopedTestPatterns);
  if (!sameValues(cachedTestFiles, currentTestFiles)) {
    return undefined;
  }

  const testsMatch = cachedTests.every(([relativePath, cachedTest]) => {
    return sourceMatches(repoRoot, relativePath, cachedTest.source);
  });
  if (!testsMatch) {
    return undefined;
  }

  const mutants = cachedFile.mutants ?? [];
  if (mutants.length === 0) {
    return undefined;
  }

  return {
    mutantCount: mutants.length,
    mutationScore: mutationScore(mutants),
  };
}
