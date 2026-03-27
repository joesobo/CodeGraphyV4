import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { sanitizeReportKey } from '../mutation/reportKey';
import { REPO_ROOT } from '../shared/repoRoot';
import { type ScrapFileMetric } from './scrapTypes';

export function baselinePathFor(targetRelativePath: string): string {
  const reportKey = sanitizeReportKey(targetRelativePath === '.' ? 'repo' : targetRelativePath);
  return join(REPO_ROOT, 'reports', 'scrap', `${reportKey}.json`);
}

export function writeScrapBaseline(
  targetRelativePath: string,
  metrics: ScrapFileMetric[]
): void {
  const baselinePath = baselinePathFor(targetRelativePath);
  mkdirSync(join(baselinePath, '..'), { recursive: true });
  writeFileSync(baselinePath, JSON.stringify(metrics, null, 2));
}
