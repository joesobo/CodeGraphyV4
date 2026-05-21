import { execFileSync as defaultExecFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export const MUTATION_SEED_ARTIFACT_NAME = 'main-mutation-seed';
export const MUTATION_SEED_WORKFLOW = 'mutation-seed.yml';
export const MUTATION_SEED_SHA_FILE = 'seed-sha.txt';

const REPORTS_ROOT = 'reports/quality-tools/mutation';

export interface MutationSeedRun {
  id: number;
  sha: string;
}

export interface HydrateMutationSeedOptions {
  packageName: string;
  repoRoot: string;
  env?: Partial<Pick<NodeJS.ProcessEnv, 'GITHUB_REF' | 'GITHUB_REF_NAME'>>;
  stdout?: Pick<typeof console, 'error'>;
  execFileSync?: typeof defaultExecFileSync;
}

export interface HydrateMutationSeedResult {
  localMainCheckout?: string;
  packageName: string;
  seedSha?: string;
  status: 'local-cache' | 'main-checkout' | 'hydrated';
}

interface GitWorktree {
  branch?: string;
  path: string;
}

function reportsRoot(repoRoot: string): string {
  return join(repoRoot, REPORTS_ROOT);
}

export function packageSeedDirectory(repoRoot: string, packageName: string): string {
  return join(reportsRoot(repoRoot), packageName);
}

export function packageIncrementalFile(repoRoot: string, packageName: string): string {
  return join(packageSeedDirectory(repoRoot, packageName), `stryker-incremental-${packageName}.json`);
}

export function hasPackageMutationSeed(repoRoot: string, packageName: string): boolean {
  return existsSync(packageIncrementalFile(repoRoot, packageName));
}

function runText(
  execFileSync: typeof defaultExecFileSync,
  command: string,
  args: string[],
  cwd: string,
): string {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function currentBranch(
  repoRoot: string,
  execFileSync: typeof defaultExecFileSync,
  env: Partial<Pick<NodeJS.ProcessEnv, 'GITHUB_REF' | 'GITHUB_REF_NAME'>>,
): string {
  if (env.GITHUB_REF === 'refs/heads/main' || env.GITHUB_REF_NAME === 'main') {
    return 'main';
  }

  return runText(execFileSync, 'git', ['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot);
}

function parseWorktrees(output: string): GitWorktree[] {
  const worktrees: GitWorktree[] = [];
  let current: GitWorktree | undefined;

  for (const line of output.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current) {
        worktrees.push(current);
      }
      current = { path: line.slice('worktree '.length) };
      continue;
    }

    if (current && line.startsWith('branch ')) {
      current.branch = line.slice('branch '.length);
    }
  }

  if (current) {
    worktrees.push(current);
  }

  return worktrees;
}

export function findLocalMainCheckout(repoRoot: string, execFileSync = defaultExecFileSync): string | undefined {
  const output = runText(execFileSync, 'git', ['worktree', 'list', '--porcelain'], repoRoot);
  return parseWorktrees(output).find((worktree) => worktree.branch === 'refs/heads/main')?.path;
}

function readSeedSha(repoRoot: string): string | undefined {
  const seedShaPath = join(reportsRoot(repoRoot), MUTATION_SEED_SHA_FILE);
  if (!existsSync(seedShaPath)) {
    return undefined;
  }

  return readFileSync(seedShaPath, 'utf8').trim() || undefined;
}

function latestSeedRun(repoRoot: string, execFileSync: typeof defaultExecFileSync): MutationSeedRun {
  let output: string;
  try {
    output = runText(execFileSync, 'gh', [
      'run',
      'list',
      '--workflow',
      MUTATION_SEED_WORKFLOW,
      '--branch',
      'main',
      '--status',
      'success',
      '--limit',
      '1',
      '--json',
      'databaseId,headSha',
    ], repoRoot);
  } catch {
    throw new Error(
      `Unable to find the latest mutation seed workflow run. Make sure gh is authenticated and the ${MUTATION_SEED_WORKFLOW} workflow has run successfully on main.`,
    );
  }

  const runs = JSON.parse(output) as Array<{ databaseId?: number; headSha?: string }>;
  const [run] = runs;
  if (!run?.databaseId || !run.headSha) {
    throw new Error(
      `No successful mutation seed artifact was found for main. Run the ${MUTATION_SEED_WORKFLOW} workflow on main before hydrating a new worktree.`,
    );
  }

  return { id: run.databaseId, sha: run.headSha };
}

function findSeedRoot(directory: string): string | undefined {
  const seedShaPath = join(directory, MUTATION_SEED_SHA_FILE);
  if (existsSync(seedShaPath)) {
    return directory;
  }

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const nestedSeedRoot = findSeedRoot(join(directory, entry.name));
    if (nestedSeedRoot) {
      return nestedSeedRoot;
    }
  }

  return undefined;
}

function copyDirectoryContents(sourceDirectory: string, destinationDirectory: string): void {
  mkdirSync(destinationDirectory, { recursive: true });

  for (const entry of readdirSync(sourceDirectory, { withFileTypes: true })) {
    const source = join(sourceDirectory, entry.name);
    const destination = join(destinationDirectory, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryContents(source, destination);
      continue;
    }

    cpSync(source, destination);
  }
}

function downloadMainSeedArtifact(
  repoRoot: string,
  mainCheckout: string,
  latestSeed: MutationSeedRun,
  execFileSync: typeof defaultExecFileSync,
): void {
  const downloadDirectory = mkdtempSync(join(tmpdir(), 'codegraphy-mutation-seed-'));
  try {
    execFileSync('gh', [
      'run',
      'download',
      String(latestSeed.id),
      '--name',
      MUTATION_SEED_ARTIFACT_NAME,
      '--dir',
      downloadDirectory,
    ], {
      cwd: repoRoot,
      stdio: 'inherit',
    });
  } catch {
    throw new Error(
      `Unable to download the ${MUTATION_SEED_ARTIFACT_NAME} artifact from mutation seed run ${latestSeed.id}.`,
    );
  }

  const seedRoot = findSeedRoot(downloadDirectory);
  if (!seedRoot) {
    throw new Error(`Downloaded ${MUTATION_SEED_ARTIFACT_NAME} did not contain ${MUTATION_SEED_SHA_FILE}.`);
  }

  copyDirectoryContents(seedRoot, reportsRoot(mainCheckout));
  writeFileSync(join(reportsRoot(mainCheckout), MUTATION_SEED_SHA_FILE), `${latestSeed.sha}\n`);
}

function copyPackageSeed(sourceRepoRoot: string, destinationRepoRoot: string, packageName: string): void {
  const source = packageIncrementalFile(sourceRepoRoot, packageName);
  if (!existsSync(source)) {
    throw new Error(
      `The main mutation seed does not contain ${packageName}. Run the mutation seed workflow on main before mutating this package.`,
    );
  }

  const destination = packageIncrementalFile(destinationRepoRoot, packageName);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination);
}

export function hydrateMutationSeed(options: HydrateMutationSeedOptions): HydrateMutationSeedResult {
  const {
    env = process.env,
    execFileSync = defaultExecFileSync,
    packageName,
    repoRoot,
    stdout = console,
  } = options;

  if (hasPackageMutationSeed(repoRoot, packageName)) {
    stdout.error(`[mutation] Using existing ${packageName} incremental cache.`);
    return { packageName, status: 'local-cache' };
  }

  if (currentBranch(repoRoot, execFileSync, env) === 'main') {
    stdout.error(`[mutation] No ${packageName} incremental cache found on main; Stryker will create it.`);
    return { packageName, status: 'main-checkout' };
  }

  const mainCheckout = findLocalMainCheckout(repoRoot, execFileSync);
  if (!mainCheckout) {
    throw new Error(
      'Unable to find a local checkout on the main branch. Create or update a main worktree before hydrating mutation seeds.',
    );
  }

  const latestSeed = latestSeedRun(repoRoot, execFileSync);
  const localSeedSha = readSeedSha(mainCheckout);
  if (localSeedSha !== latestSeed.sha) {
    stdout.error(`[mutation] Updating local main mutation seed from CI run ${latestSeed.id} (${latestSeed.sha}).`);
    downloadMainSeedArtifact(repoRoot, mainCheckout, latestSeed, execFileSync);
  }

  copyPackageSeed(mainCheckout, repoRoot, packageName);
  stdout.error(`[mutation] Hydrated ${packageName} incremental cache from local main seed.`);
  return {
    localMainCheckout: mainCheckout,
    packageName,
    seedSha: latestSeed.sha,
    status: 'hydrated',
  };
}
