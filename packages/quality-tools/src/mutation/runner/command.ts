import { cleanCliArgs, flagValue, parseBareTargetArg } from '../../shared/cliArgs';
import { REPO_ROOT } from '../../shared/resolve/repoRoot';
import { resolveQualityTarget, type QualityTarget } from '../../shared/resolve/target';
import { discoverMutationPackageNames } from '../analysis/profile';
import { runMutation } from './run';
import { execFileSync } from 'child_process';

export interface MutationCliDependencies {
  discoverMutationPackageNames: typeof discoverMutationPackageNames;
  resolveQualityTarget: typeof resolveQualityTarget;
  runMutation: typeof runMutation;
  runPreflightTypecheck: () => void;
}

const DEFAULT_DEPENDENCIES: MutationCliDependencies = {
  discoverMutationPackageNames,
  resolveQualityTarget,
  runMutation,
  runPreflightTypecheck: () => {
    execFileSync('pnpm', ['run', 'typecheck'], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    });
  },
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

function assertMutationTargetsSupported(targets: readonly QualityTarget[]): void {
  for (const target of targets) {
    if (target.packageName) {
      continue;
    }

    throw new Error(
      'Mutation requires a workspace package, directory, or file inside one. Example: `pnpm run mutate -- extension/` or `pnpm run mutate -- --mutate packages/extension/src/foo.ts`.',
    );
  }
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
  assertMutationTargetsSupported(targets);
  dependencies.runPreflightTypecheck();
  targets.forEach((target) => {
    dependencies.runMutation(target);
  });
}
