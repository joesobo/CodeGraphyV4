import { cleanCliArgs, flagValue, parseTargetArg } from '../shared/cliArgs';
import { REPO_ROOT } from '../shared/resolve/repoRoot';
import { resolveQualityTarget } from '../shared/resolve/target';
import { analyzeScrap } from './analysis/run';
import { applyBaselineComparison } from './test/compare';
import { hasPolicyViolations } from './policy/violations';
import { policyFailureMessage } from './policy/failureMessage';
import { resolveScrapPolicy } from './policy/resolve';
import { reportScrap } from './report/format';
import { baseline } from './baseline';

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
    baseline(target.relativePath, metrics);
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
