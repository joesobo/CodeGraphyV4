import { cleanCliArgs, flagValue, parseBareTargetArg } from '../../shared/cliArgs';
import { REPO_ROOT } from '../../shared/resolve/repoRoot';
import { resolveQualityTarget, type QualityTarget } from '../../shared/resolve/target';
import { discoverMutationPackageNames } from '../analysis/profile';
import { runMutation } from './run';

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
  mutateInput: string | undefined,
  dependencies: MutationCliDependencies
): QualityTarget[] {
  if (mutateInput) {
    return [dependencies.resolveQualityTarget(REPO_ROOT, mutateInput)];
  }

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
  const targets = resolveCliTargets(
    parseBareTargetArg(args),
    flagValue(args, '--mutate'),
    dependencies,
  );
  targets.forEach((target) => {
    dependencies.runMutation(target);
  });
}
