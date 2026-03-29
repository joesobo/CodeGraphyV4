import { DEFAULT_EXCLUDE_PATTERNS } from '../config/defaults';

export interface WorkspaceAnalyzerDiscoveryConfig {
  include: string[];
  maxFiles: number;
  respectGitignore: boolean;
}

export interface WorkspaceAnalyzerDiscoveryResult<TFile> {
  durationMs: number;
  files: TFile[];
  limitReached: boolean;
  totalFound: number;
}

export interface WorkspaceAnalyzerDiscoveryDependencies<TFile> {
  discover(options: {
    exclude: string[];
    include: string[];
    maxFiles: number;
    respectGitignore: boolean;
    rootPath: string;
    signal?: AbortSignal;
  }): Promise<WorkspaceAnalyzerDiscoveryResult<TFile>>;
}

export async function discoverWorkspaceAnalyzerFiles<TFile>(
  dependencies: WorkspaceAnalyzerDiscoveryDependencies<TFile>,
  workspaceRoot: string,
  config: WorkspaceAnalyzerDiscoveryConfig,
  filterPatterns: string[],
  pluginFilterPatterns: string[],
  signal?: AbortSignal,
): Promise<WorkspaceAnalyzerDiscoveryResult<TFile>> {
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

export function formatWorkspaceAnalyzerLimitReachedMessage(
  totalFound: number,
  maxFiles: number,
): string {
  return (
    `CodeGraphy: Found ${totalFound}+ files, showing first ${maxFiles}. `
    + 'Increase codegraphy.maxFiles in settings to see more.'
  );
}
