import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { sanitizeReportKey } from '../shared/util/reportKey';
import { REPO_ROOT } from '../shared/resolve/repoRoot';
import { type ScrapFileMetric } from './types';

export function baselinePathFor(targetRelativePath: string): string {
  const reportKey = sanitizeReportKey(targetRelativePath === '.' ? 'repo' : targetRelativePath);
  return join(REPO_ROOT, 'reports', 'scrap', `${reportKey}.json`);
}

export function baseline(
  targetRelativePath: string,
  metrics: ScrapFileMetric[]
): void {
  const baselinePath = baselinePathFor(targetRelativePath);
  mkdirSync(join(baselinePath, '..'), { recursive: true });
  writeFileSync(baselinePath, JSON.stringify(metrics, null, 2));
}
