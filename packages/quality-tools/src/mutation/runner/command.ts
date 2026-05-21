import { cleanCliArgs, flagValue, parseBareTargetArg } from '../../shared/cliArgs';
import { REPO_ROOT } from '../../shared/resolve/repoRoot';
import { resolveQualityTarget, type QualityTarget } from '../../shared/resolve/target';
import { runMutation, type MutationRunOptions } from './run';

export interface MutationCliDependencies {
  resolveQualityTarget: typeof resolveQualityTarget;
  runMutation: (target: QualityTarget, options?: MutationRunOptions) => Promise<void>;
}

const DEFAULT_DEPENDENCIES: MutationCliDependencies = {
  resolveQualityTarget,
  runMutation,
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

  throw new Error(
    'Mutation requires an explicit package, directory, or file target. Example: `pnpm run mutate -- extension/` or `pnpm run mutate -- packages/extension/src/foo.ts`.',
  );
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
  const runOptions = {
    force: args.includes('--force'),
  };
  for (const target of targets) {
    await dependencies.runMutation(target, runOptions);
  }
}
