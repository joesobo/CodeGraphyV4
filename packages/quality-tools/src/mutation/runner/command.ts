import { cleanCliArgs, flagValue, parseBareTargetArg } from '../../shared/cliArgs';
import { REPO_ROOT } from '../../shared/resolve/repoRoot';
import { resolveQualityTarget, type QualityTarget } from '../../shared/resolve/target';
import { discoverMutationPackageNames } from '../analysis/profile';
import { runMutation, type MutationRunOptions } from './run';
import { execFileSync } from 'child_process';

export interface MutationCliDependencies {
  discoverMutationPackageNames: typeof discoverMutationPackageNames;
  resolveQualityTarget: typeof resolveQualityTarget;
  runMutation: (target: QualityTarget, options?: MutationRunOptions) => Promise<void>;
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
      'Mutation requires a workspace package, directory, or file inside one. Example: `pnpm run mutate -- extension/` or `pnpm run mutate -- packages/extension/src/foo.ts`.',
    );
  }
}

function shouldRunPreflightTypecheck(args: readonly string[], targets: readonly QualityTarget[]): boolean {
  if (args.includes('--skip-typecheck') || process.env.CODEGRAPHY_MUTATE_SKIP_TYPECHECK === '1') {
    return false;
  }

  return targets.some((target) => target.kind !== 'file');
}

export async function runMutationCli(
  rawArgs: string[],
  dependencies: MutationCliDependencies = DEFAULT_DEPENDENCIES
): Promise<void> {
  const args = cleanCliArgs(rawArgs);
  const targets = resolveCliTargets(
    parseBareTargetArg(args),
    flagValue(args, '--mutate'),
    dependencies,
  );
  assertMutationTargetsSupported(targets);
  if (shouldRunPreflightTypecheck(args, targets)) {
    dependencies.runPreflightTypecheck();
  }
  const runOptions = {
    force: args.includes('--force'),
  };
  for (const target of targets) {
    await dependencies.runMutation(target, runOptions);
  }
}
