import { cleanCliArgs, parseTargetArg } from '../shared/cliArgs';
import { REPO_ROOT } from '../shared/resolve/repoRoot';
import { resolveQualityTarget } from '../shared/resolve/target';
import { analyzeReachability } from './analyze';
import { reportReachability } from './report';

export interface ReachabilityCliDependencies {
  analyzeReachability: typeof analyzeReachability;
  reportReachability: typeof reportReachability;
  resolveQualityTarget: typeof resolveQualityTarget;
  setExitCode: (code: number) => void;
}

const DEFAULT_DEPENDENCIES: ReachabilityCliDependencies = {
  analyzeReachability,
  reportReachability,
  resolveQualityTarget,
  setExitCode: (code) => {
    process.exitCode = code;
  }
};

export function runReachabilityCli(
  rawArgs: string[],
  dependencies: ReachabilityCliDependencies = DEFAULT_DEPENDENCIES,
): void {
  const args = cleanCliArgs(rawArgs);
  const target = dependencies.resolveQualityTarget(
    REPO_ROOT,
    parseTargetArg(args, ['--json', '--strict', '--verbose']),
  );
  const report = dependencies.analyzeReachability(REPO_ROOT, target);
  const verbose = args.includes('--verbose');
  const strict = args.includes('--strict');
  const json = args.includes('--json');

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    dependencies.reportReachability(report, { verbose });
  }

  const hasHardFailures = report.deadEnds.length > 0;
  const hasStrictFailures = strict && report.deadSurfaces.length > 0;

  if (hasHardFailures || hasStrictFailures) {
    dependencies.setExitCode(1);
  }
}
