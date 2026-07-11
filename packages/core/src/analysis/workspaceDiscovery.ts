import { DEFAULT_EXCLUDE } from '../discovery/pathMatching';
import type { IFilesExcludeRule } from '../discovery/contracts';

export interface WorkspacePipelineDiscoveryConfig {
  filesExclude?: IFilesExcludeRule[];
  include: string[];
  maxFiles: number;
  respectGitignore: boolean;
}

export interface WorkspacePipelineDiscoveryResult<TFile> {
  directories?: string[];
  durationMs: number;
  files: TFile[];
  filesExcludedCount?: number;
  filesExcludedPaths?: string[];
  gitIgnoredPaths?: string[];
  limitReached: boolean;
  totalFound: number;
}

export interface WorkspacePipelineDiscoveryDependencies<TFile> {
  discover(options: {
    exclude: string[];
    filesExclude?: IFilesExcludeRule[];
    include: string[];
    maxFiles: number;
    respectGitignore: boolean;
    rootPath: string;
    signal?: AbortSignal;
  }): Promise<WorkspacePipelineDiscoveryResult<TFile>>;
}

export async function discoverWorkspacePipelineFiles<TFile>(
  dependencies: WorkspacePipelineDiscoveryDependencies<TFile>,
  workspaceRoot: string,
  config: WorkspacePipelineDiscoveryConfig,
  filterPatterns: string[],
  pluginFilterPatterns: string[],
  signal?: AbortSignal,
): Promise<WorkspacePipelineDiscoveryResult<TFile>> {
  return dependencies.discover({
    rootPath: workspaceRoot,
    maxFiles: config.maxFiles,
    include: config.include,
    exclude: [
        ...new Set([
        ...DEFAULT_EXCLUDE,
        ...pluginFilterPatterns,
        ...filterPatterns,
      ]),
    ],
    filesExclude: config.filesExclude,
    respectGitignore: config.respectGitignore,
    signal,
  });
}

export function formatWorkspacePipelineLimitReachedMessage(
  totalFound: number,
  maxFiles: number,
): string {
  return (
    `CodeGraphy: Found ${totalFound}+ files, showing first ${maxFiles}. `
    + 'Increase maxFiles in .codegraphy/settings.json to see more.'
  );
}
