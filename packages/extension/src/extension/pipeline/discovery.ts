import { DEFAULT_EXCLUDE_PATTERNS } from '../config/defaults';

export interface WorkspacePipelineDiscoveryConfig {
  include: string[];
  maxFiles: number;
  respectGitignore: boolean;
}

export interface WorkspacePipelineDiscoveryResult<TFile> {
  durationMs: number;
  files: TFile[];
  limitReached: boolean;
  totalFound: number;
}

export interface WorkspacePipelineDiscoveryDependencies<TFile> {
  discover(options: {
    exclude: string[];
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
        ...DEFAULT_EXCLUDE_PATTERNS,
        ...pluginFilterPatterns,
        ...filterPatterns,
      ]),
    ],
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
    + 'Increase codegraphy.maxFiles in settings to see more.'
  );
}
