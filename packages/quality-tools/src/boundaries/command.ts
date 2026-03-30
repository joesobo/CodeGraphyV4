import { cleanCliArgs, parseTargetArg } from '../shared/cliArgs';
import { REPO_ROOT } from '../shared/resolve/repoRoot';
import { resolveQualityTarget } from '../shared/resolve/target';
import { analyzeBoundaries } from './analyze';
import { reportBoundaries } from './report';

export interface BoundariesCliDependencies {
  analyzeBoundaries: typeof analyzeBoundaries;
  reportBoundaries: typeof reportBoundaries;
  resolveQualityTarget: typeof resolveQualityTarget;
  setExitCode: (code: number) => void;
}

const DEFAULT_DEPENDENCIES: BoundariesCliDependencies = {
  analyzeBoundaries,
  reportBoundaries,
  resolveQualityTarget,
  setExitCode: (code) => {
    process.exitCode = code;
  }
};

export function runBoundariesCli(
  rawArgs: string[],
  dependencies: BoundariesCliDependencies = DEFAULT_DEPENDENCIES
): void {
  const args = cleanCliArgs(rawArgs);
  const target = dependencies.resolveQualityTarget(
    REPO_ROOT,
    parseTargetArg(args, ['--json', '--strict', '--verbose'])
  );
  const report = dependencies.analyzeBoundaries(REPO_ROOT, target);
  const verbose = args.includes('--verbose');
  const strict = args.includes('--strict');
  const json = args.includes('--json');

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    dependencies.reportBoundaries(report, { verbose });
  }

  const hasHardFailures = report.layerViolations.length > 0 || report.deadEnds.length > 0;
  const hasStrictFailures = strict && report.deadSurfaces.length > 0;

  if (hasHardFailures || hasStrictFailures) {
    dependencies.setExitCode(1);
  }
}
