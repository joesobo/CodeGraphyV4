import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { sanitizeReportKey } from '../mutation/reportKey';
import { cleanCliArgs, flagValue, parseTargetArg } from '../shared/cliArgs';
import { REPO_ROOT } from '../shared/repoRoot';
import { resolveQualityTarget } from '../shared/resolveTarget';
import { analyzeScrap } from './analyzeScrap';
import { applyBaselineComparison } from './baselineCompare';
import { reportScrap } from './reportScrap';

export interface ScrapCliDependencies {
  analyzeScrap: typeof analyzeScrap;
  reportScrap: typeof reportScrap;
  resolveQualityTarget: typeof resolveQualityTarget;
}

const DEFAULT_DEPENDENCIES: ScrapCliDependencies = {
  analyzeScrap,
  reportScrap,
  resolveQualityTarget
};

function baselinePathFor(targetRelativePath: string): string {
  const reportKey = sanitizeReportKey(targetRelativePath === '.' ? 'repo' : targetRelativePath);
  return join(REPO_ROOT, 'reports', 'scrap', `${reportKey}.json`);
}

export function runScrapCli(
  rawArgs: string[],
  dependencies: ScrapCliDependencies = DEFAULT_DEPENDENCIES
): void {
  const args = cleanCliArgs(rawArgs);
  const target = dependencies.resolveQualityTarget(REPO_ROOT, parseTargetArg(args));
  const comparePath = flagValue(args, '--compare');
  const verbose = args.includes('--verbose');
  const writeBaseline = args.includes('--write-baseline');
  let metrics = dependencies.analyzeScrap(target);

  if (comparePath) {
    metrics = applyBaselineComparison(metrics, comparePath);
  }

  if (writeBaseline) {
    const baselinePath = baselinePathFor(target.relativePath);
    mkdirSync(join(baselinePath, '..'), { recursive: true });
    writeFileSync(baselinePath, JSON.stringify(metrics, null, 2));
  }

  if (args.includes('--json')) {
    console.log(JSON.stringify(metrics, null, 2));
    return;
  }

  dependencies.reportScrap(metrics, REPO_ROOT, { verbose });
}
