import { cleanCliArgs, flagValue, parseTargetArg } from '../shared/cliArgs';
import { REPO_ROOT } from '../shared/repoRoot';
import { resolveQualityTarget } from '../shared/resolveTarget';
import { analyzeScrap } from './analyzeScrap';
import { applyBaselineComparison } from './baselineCompare';
import { hasPolicyViolations, policyFailureMessage, resolveScrapPolicy } from './scrapPolicy';
import { reportScrap } from './reportScrap';
import { writeScrapBaseline } from './writeScrapBaseline';

export interface ScrapCliDependencies {
  analyzeScrap: typeof analyzeScrap;
  reportScrap: typeof reportScrap;
  resolveQualityTarget: typeof resolveQualityTarget;
  setExitCode: (code: number) => void;
}

const DEFAULT_DEPENDENCIES: ScrapCliDependencies = {
  analyzeScrap,
  reportScrap,
  resolveQualityTarget,
  setExitCode: (code) => {
    process.exitCode = code;
  }
};

export function runScrapCli(
  rawArgs: string[],
  dependencies: ScrapCliDependencies = DEFAULT_DEPENDENCIES
): void {
  const args = cleanCliArgs(rawArgs);
  const target = dependencies.resolveQualityTarget(REPO_ROOT, parseTargetArg(args, ['--compare', '--policy']));
  const comparePath = flagValue(args, '--compare');
  const verbose = args.includes('--verbose');
  const writeBaseline = args.includes('--write-baseline');
  const policy = resolveScrapPolicy(args);
  let metrics = dependencies.analyzeScrap(target);

  if (comparePath) {
    metrics = applyBaselineComparison(metrics, comparePath);
  }

  if (writeBaseline) {
    writeScrapBaseline(target.relativePath, metrics);
  }

  const policyFailure = hasPolicyViolations(metrics, policy);
  const failureMessage = policyFailureMessage(policy);

  if (args.includes('--json')) {
    console.log(JSON.stringify(metrics, null, 2));
    if (policyFailure) {
      dependencies.setExitCode(1);
    }
    return;
  }

  dependencies.reportScrap(metrics, REPO_ROOT, { verbose });
  if (policyFailure && failureMessage) {
    console.error(failureMessage);
    dependencies.setExitCode(1);
  }
}
