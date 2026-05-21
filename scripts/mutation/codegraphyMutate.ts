import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { cleanCliArgs, flagValue } from '../../packages/quality-tools/src/shared/cliArgs';
import { REPO_ROOT } from '../../packages/quality-tools/src/shared/resolve/repoRoot';
import { resolveQualityTarget, type QualityTarget } from '../../packages/quality-tools/src/shared/resolve/target';
import { runMutationCli } from '../../packages/quality-tools/src/mutation/runner/command';
import { hydrateMutationSeed } from './seedCache';

interface CodeGraphyMutationDependencies {
  hydrateMutationSeed: typeof hydrateMutationSeed;
  repoRoot: string;
  resolveQualityTarget: typeof resolveQualityTarget;
  runMutationCli: typeof runMutationCli;
}

interface PreparedMutationRun {
  forwardedArgs: string[];
  target?: QualityTarget;
}

const DEFAULT_DEPENDENCIES: CodeGraphyMutationDependencies = {
  hydrateMutationSeed,
  repoRoot: REPO_ROOT,
  resolveQualityTarget,
  runMutationCli,
};

function bareTargetArgs(args: readonly string[]): string[] {
  const targets: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--mutate') {
      index += 1;
      continue;
    }

    if (!arg.startsWith('--')) {
      targets.push(arg);
    }
  }

  return targets;
}

function removeBareTargets(args: readonly string[], count: number): string[] {
  const filtered: string[] = [];
  let removed = 0;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--mutate') {
      filtered.push(arg);
      if (index + 1 < args.length) {
        filtered.push(args[index + 1]);
        index += 1;
      }
      continue;
    }

    if (!arg.startsWith('--') && removed < count) {
      removed += 1;
      continue;
    }

    filtered.push(arg);
  }

  return filtered;
}

function normalizeScopedTargetInput(repoRoot: string, packageTarget: QualityTarget, scopedInput: string): string {
  if (isAbsolute(scopedInput) || scopedInput.startsWith('packages/') || existsSync(resolve(repoRoot, scopedInput))) {
    return scopedInput;
  }

  if (!packageTarget.packageName) {
    return scopedInput;
  }

  return join('packages', packageTarget.packageName, scopedInput);
}

export function prepareCodeGraphyMutationRun(
  rawArgs: string[],
  dependencies: Pick<CodeGraphyMutationDependencies, 'repoRoot' | 'resolveQualityTarget'> = DEFAULT_DEPENDENCIES,
): PreparedMutationRun {
  const args = cleanCliArgs(rawArgs);
  const mutateInput = flagValue(args, '--mutate');
  if (mutateInput) {
    return {
      forwardedArgs: args,
      target: dependencies.resolveQualityTarget(dependencies.repoRoot, mutateInput),
    };
  }

  const bareTargets = bareTargetArgs(args);
  if (bareTargets.length < 2) {
    const target = bareTargets[0]
      ? dependencies.resolveQualityTarget(dependencies.repoRoot, bareTargets[0])
      : undefined;

    return {
      forwardedArgs: args,
      target,
    };
  }

  const packageTarget = dependencies.resolveQualityTarget(dependencies.repoRoot, bareTargets[0]);
  if (!packageTarget.packageName) {
    throw new Error(
      `Scoped mutation target "${bareTargets[0]}" must resolve to a workspace package before a file path can be applied.`,
    );
  }

  const scopedInput = normalizeScopedTargetInput(dependencies.repoRoot, packageTarget, bareTargets[1]);
  const target = dependencies.resolveQualityTarget(dependencies.repoRoot, scopedInput);
  if (target.packageName !== packageTarget.packageName) {
    throw new Error(
      `Scoped mutation target "${bareTargets[1]}" resolves to ${target.packageName ?? 'no package'}, not ${packageTarget.packageName}.`,
    );
  }

  return {
    forwardedArgs: [scopedInput, ...removeBareTargets(args, 2)],
    target,
  };
}

export async function runCodeGraphyMutationCli(
  rawArgs: string[],
  dependencies: CodeGraphyMutationDependencies = DEFAULT_DEPENDENCIES,
): Promise<void> {
  const preparedRun = prepareCodeGraphyMutationRun(rawArgs, dependencies);
  if (preparedRun.target?.packageName) {
    dependencies.hydrateMutationSeed({
      packageName: preparedRun.target.packageName,
      repoRoot: dependencies.repoRoot,
    });
  }

  await dependencies.runMutationCli(preparedRun.forwardedArgs);
}
