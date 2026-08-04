import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { minimatch } from 'minimatch';
import { collectGitIgnoredPathsFromGit } from '../../../discovery/file/service';
import { isDefaultExcludedPath } from '../../../discovery/pathMatching';
import { readCodeGraphyWorkspaceSettings } from '../../../workspace/settings';
import {
  createActiveWorkspaceFilterPatterns,
  isWorkspaceDiscoveryLifecyclePath,
  isWorkspaceLiveUpdatePathEligible,
} from '../eligibility';

export interface WorkspaceObservationPlan {
  readonly directories: readonly string[];
  readonly files: Set<string>;
  readonly policy: WorkspaceObservationPolicy;
}

function normalizeWorkspacePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function runGit(workspaceRoot: string, args: readonly string[]): string | undefined {
  const result = spawnSync('git', ['-C', workspaceRoot, ...args], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return result.status === 0 ? result.stdout : undefined;
}

function collectTrackedDirectoryPaths(workspaceRoot: string): Set<string> {
  const output = runGit(workspaceRoot, ['ls-files', '-z']);
  const directories = new Set<string>();
  if (output === undefined) return directories;
  for (const filePath of output.split('\0').filter(Boolean)) {
    let directoryPath = path.posix.dirname(normalizeWorkspacePath(filePath));
    while (directoryPath !== '.') {
      directories.add(directoryPath);
      directoryPath = path.posix.dirname(directoryPath);
    }
  }
  return directories;
}

function createPrunableFilterPatterns(patterns: readonly string[]): string[] {
  return patterns.flatMap((pattern) => {
    if (pattern.startsWith('!')) return [];
    if (pattern.endsWith('/**/*')) return [pattern.slice(0, -5)];
    if (pattern.endsWith('/**')) return [pattern.slice(0, -3)];
    return [];
  });
}

function isGitIgnoredPath(
  gitIgnoredPaths: ReadonlySet<string>,
  workspacePath: string,
): boolean {
  return gitIgnoredPaths.has(workspacePath) || gitIgnoredPaths.has(`${workspacePath}/`);
}

export class WorkspaceObservationPolicy {
  private readonly activeFilterPatterns: readonly string[];
  private readonly prunableFilterPatterns: readonly string[];
  private readonly trackedDirectoryPaths: ReadonlySet<string>;

  constructor(
    private readonly workspaceRoot: string,
    activeFilterPatterns: readonly string[],
    private readonly respectGitignore: boolean,
  ) {
    this.activeFilterPatterns = activeFilterPatterns;
    this.prunableFilterPatterns = createPrunableFilterPatterns(activeFilterPatterns);
    this.trackedDirectoryPaths = respectGitignore
      ? collectTrackedDirectoryPaths(workspaceRoot)
      : new Set<string>();
  }

  filterEligiblePaths(workspacePaths: readonly string[]): string[] {
    const gitIgnoredPaths = this.respectGitignore
      ? collectGitIgnoredPathsFromGit(this.workspaceRoot, workspacePaths) ?? new Set<string>()
      : new Set<string>();
    return workspacePaths.filter(workspacePath => this.isEligiblePath(
      workspacePath,
      gitIgnoredPaths,
    ));
  }

  gitIgnoredPaths(workspacePaths: readonly string[]): ReadonlySet<string> {
    return this.respectGitignore
      ? collectGitIgnoredPathsFromGit(this.workspaceRoot, workspacePaths) ?? new Set<string>()
      : new Set<string>();
  }

  isEligiblePath(workspacePath: string, gitIgnoredPaths: ReadonlySet<string>): boolean {
    return isWorkspaceLiveUpdatePathEligible(
      workspacePath,
      this.activeFilterPatterns,
      gitIgnoredPaths,
    ) && (
      isWorkspaceDiscoveryLifecyclePath(workspacePath)
      || !isDefaultExcludedPath(workspacePath)
    );
  }

  canObserveDirectory(
    workspacePath: string,
    gitIgnoredPaths: ReadonlySet<string>,
  ): boolean {
    if (isDefaultExcludedPath(workspacePath)) return false;
    if (
      isGitIgnoredPath(gitIgnoredPaths, workspacePath)
      && !this.trackedDirectoryPaths.has(workspacePath)
    ) return false;
    return !this.prunableFilterPatterns.some(pattern => minimatch(
      workspacePath,
      pattern,
      { dot: true, matchBase: false },
    ));
  }
}

interface WorkspaceObservationCandidates {
  directories: string[];
  files: string[];
}

async function walkObservationCandidates(
  physicalRoot: string,
  relativeDirectory: string,
  policy: WorkspaceObservationPolicy,
  candidates: WorkspaceObservationCandidates,
): Promise<void> {
  const absoluteDirectory = relativeDirectory
    ? path.join(physicalRoot, relativeDirectory)
    : physicalRoot;
  let entries;
  try {
    entries = await readdir(absoluteDirectory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const workspacePath = normalizeWorkspacePath(
      relativeDirectory ? path.join(relativeDirectory, entry.name) : entry.name,
    );
    if (entry.isDirectory()) {
      if (!policy.canObserveDirectory(workspacePath, new Set<string>())) continue;
      candidates.directories.push(workspacePath);
      await walkObservationCandidates(physicalRoot, workspacePath, policy, candidates);
      continue;
    }
    if (entry.isFile()) candidates.files.push(workspacePath);
  }
}

export async function buildWorkspaceObservationPlan(
  physicalRoot: string,
): Promise<WorkspaceObservationPlan> {
  const settings = readCodeGraphyWorkspaceSettings(physicalRoot);
  const policy = new WorkspaceObservationPolicy(
    physicalRoot,
    createActiveWorkspaceFilterPatterns(settings),
    settings.respectGitignore,
  );
  const candidates: WorkspaceObservationCandidates = { directories: [], files: [] };
  await walkObservationCandidates(physicalRoot, '', policy, candidates);
  const gitIgnoredPaths = policy.gitIgnoredPaths([
    ...candidates.directories.map(directory => `${directory}/`),
    ...candidates.files,
  ]);
  const directories = [
    physicalRoot,
    ...candidates.directories
      .filter(directory => policy.canObserveDirectory(directory, gitIgnoredPaths))
      .map(directory => path.join(physicalRoot, directory)),
  ];
  const files = new Set(candidates.files.filter(file => policy.isEligiblePath(
    file,
    gitIgnoredPaths,
  )));
  return { directories, files, policy };
}

export function resolveGitPolicyDependencyPaths(workspaceRoot: string): string[] {
  const paths = new Set<string>();
  for (const gitPath of ['index', 'info/exclude']) {
    const resolved = runGit(workspaceRoot, ['rev-parse', '--git-path', gitPath])?.trim();
    if (resolved) paths.add(path.resolve(workspaceRoot, resolved));
  }
  const globalExcludes = runGit(workspaceRoot, ['config', '--path', 'core.excludesFile'])?.trim();
  if (globalExcludes) paths.add(path.resolve(workspaceRoot, globalExcludes));
  return [...paths];
}
