import { cleanCliArgs, parseTargetArg } from '../shared/cliArgs';
import { REPO_ROOT } from '../shared/repoRoot';
import { resolveQualityTarget, type QualityTarget } from '../shared/resolveTarget';
import { discoverMutationPackageNames } from './mutationProfile';
import { runMutation } from './runMutation';

export interface MutationCliDependencies {
  discoverMutationPackageNames: typeof discoverMutationPackageNames;
  resolveQualityTarget: typeof resolveQualityTarget;
  runMutation: typeof runMutation;
}

const DEFAULT_DEPENDENCIES: MutationCliDependencies = {
  discoverMutationPackageNames,
  resolveQualityTarget,
  runMutation
};

function resolveCliTargets(
  input: string | undefined,
  dependencies: MutationCliDependencies
): QualityTarget[] {
  if (input) {
    return [dependencies.resolveQualityTarget(REPO_ROOT, input)];
  }

  return dependencies.discoverMutationPackageNames(REPO_ROOT).map((packageName) => (
    dependencies.resolveQualityTarget(REPO_ROOT, packageName)
  ));
} 

export function runMutationCli(
  rawArgs: string[],
  dependencies: MutationCliDependencies = DEFAULT_DEPENDENCIES
): void {
  const args = cleanCliArgs(rawArgs);
  const targets = resolveCliTargets(parseTargetArg(args), dependencies);
  targets.forEach((target) => {
    dependencies.runMutation(target);
  });
}
