import { DEFAULT_EXCLUDE } from '../discovery/pathMatching';

export interface WorkspacePipelineDiscoveryConfig {
  include: string[];
  maxFiles: number;
  respectGitignore: boolean;
}

export interface WorkspacePipelineDiscoveryResult<TFile> {
  directories?: string[];
  durationMs: number;
  files: TFile[];
  cacheFilePaths: string[];
  gitIgnoredPaths?: string[];
  limitReached: boolean;
  totalFound: number;
}

export interface WorkspacePipelineDiscoveryDependencies<TFile> {
  discover(options: {
    exclude: string[];
    filter: string[];
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
  signal?: AbortSignal,
  filterPatterns: readonly string[] = [],
): Promise<WorkspacePipelineDiscoveryResult<TFile>> {
  return dependencies.discover({
    rootPath: workspaceRoot,
    maxFiles: config.maxFiles,
    include: config.include,
    exclude: [...DEFAULT_EXCLUDE],
    filter: [...filterPatterns],
    respectGitignore: config.respectGitignore,
    signal,
  });
}

export function formatWorkspacePipelineLimitReachedMessage(
  totalFound: number,
  maxFiles: number,
): string {
  return (
    `CodeGraphy: Found ${totalFound} files, showing first ${maxFiles}. `
    + 'Increase maxFiles in .codegraphy/settings.json to see more.'
  );
}
