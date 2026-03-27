import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { cleanCliArgs, flagValue, parseTargetArg } from '../shared/cliArgs';
import { REPO_ROOT } from '../shared/repoRoot';
import { resolveQualityTarget } from '../shared/resolveTarget';
import { sanitizeReportKey } from '../mutation/reportKey';
import { analyzeOrganize } from './analyzeOrganize';
import { compareBaseline } from './baselineCompare';
import { reportOrganize } from './reportOrganize';

export interface OrganizeCliDependencies {
  analyzeOrganize: typeof analyzeOrganize;
  reportOrganize: typeof reportOrganize;
  resolveQualityTarget: typeof resolveQualityTarget;
  setExitCode: (code: number) => void;
}

const DEFAULT_DEPENDENCIES: OrganizeCliDependencies = {
  analyzeOrganize,
  reportOrganize,
  resolveQualityTarget,
  setExitCode: (code) => {
    process.exitCode = code;
  }
};

function baselinePathFor(targetRelativePath: string): string {
  const reportKey = sanitizeReportKey(targetRelativePath === '.' ? 'repo' : targetRelativePath);
  return join(REPO_ROOT, 'reports', 'organize', `${reportKey}.json`);
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

  let metrics = dependencies.analyzeOrganize(target);

  if (comparePath) {
    const comparisons = compareBaseline(metrics, comparePath);
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
    mkdirSync(join(baselinePath, '..'), { recursive: true });
    // Write the base metrics without comparison data
    const baseMetrics = metrics.map(({ comparison, ...rest }) => rest);
    writeFileSync(baselinePath, JSON.stringify(baseMetrics, null, 2));
  }

  if (args.includes('--json')) {
    console.log(JSON.stringify(metrics, null, 2));
    return;
  }

  dependencies.reportOrganize(metrics, { verbose });
}
