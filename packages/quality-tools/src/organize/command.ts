import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { cleanCliArgs, flagValue, parseTargetArg } from '../shared/cliArgs';
import { REPO_ROOT } from '../shared/resolve/repoRoot';
import { resolveQualityTarget } from '../shared/resolve/target';
import { sanitizeReportKey } from '../shared/util/reportKey';
import { analyze } from './analyze';
import { compareBaseline } from './baselineCompare';
import { reportOrganize } from './report/format';
import type { OrganizeDirectoryMetric } from './types';

export interface OrganizeCliDependencies {
  analyze: typeof analyze;
  compareBaseline: typeof compareBaseline;
  mkdirSync: typeof mkdirSync;
  reportOrganize: typeof reportOrganize;
  resolveQualityTarget: typeof resolveQualityTarget;
  setExitCode: (code: number) => void;
  writeFileSync: typeof writeFileSync;
}

const DEFAULT_DEPENDENCIES: OrganizeCliDependencies = {
  analyze,
  compareBaseline,
  mkdirSync,
  reportOrganize,
  resolveQualityTarget,
  setExitCode: (code) => {
    process.exitCode = code;
  },
  writeFileSync
};

function baselineReportTarget(targetRelativePath: string): string {
  if (targetRelativePath === '.') {
    return 'repo';
  }

  return targetRelativePath;
}

export function baselinePathFor(targetRelativePath: string): string {
  const reportKey = sanitizeReportKey(baselineReportTarget(targetRelativePath));
  return join(REPO_ROOT, 'reports', 'organize', `${reportKey}.json`);
}

export function stripComparisonsForBaseline(
  metrics: Array<OrganizeDirectoryMetric & { comparison?: unknown }>
): OrganizeDirectoryMetric[] {
  return metrics.map(({ comparison: _comparison, ...rest }) => rest);
}

export function runOrganizeCli(
  rawArgs: string[],
  dependencies: OrganizeCliDependencies = DEFAULT_DEPENDENCIES
): void {
  const args = cleanCliArgs(rawArgs);
  const target = dependencies.resolveQualityTarget(REPO_ROOT, parseTargetArg(args, ['--compare']));
  const verbose = args.includes('--verbose');
  const writeBaseline = args.includes('--write-baseline');
  const comparePath = flagValue(args, '--compare');

  let metrics = dependencies.analyze(target);

  if (comparePath) {
    const comparisons = dependencies.compareBaseline(metrics, comparePath);
    // Attach comparisons to metrics for reporting
    // Store comparisons for later use if needed
    const metricsWithComparisons = metrics.map((metric) => ({
      ...metric,
      comparison: comparisons.get(metric.directoryPath)
    }));
    metrics = metricsWithComparisons;
  }

  if (writeBaseline) {
    const baselinePath = baselinePathFor(target.relativePath);
    dependencies.mkdirSync(join(baselinePath, '..'), { recursive: true });
    const baseMetrics = stripComparisonsForBaseline(metrics);
    dependencies.writeFileSync(baselinePath, JSON.stringify(baseMetrics, null, 2));
  }

  if (args.includes('--json')) {
    console.log(JSON.stringify(metrics, null, 2));
    return;
  }

  dependencies.reportOrganize(metrics, { verbose });
}
