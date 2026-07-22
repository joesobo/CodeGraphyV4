import type { IDiscoveredFile } from '@codegraphy-dev/core';
import type { FileDiscovery } from '@codegraphy-dev/core';
import {
  discoverWorkspacePipelineFiles,
  formatWorkspacePipelineLimitReachedMessage,
  type WorkspacePipelineDiscoveryConfig,
  type WorkspacePipelineDiscoveryDependencies,
  type WorkspacePipelineDiscoveryResult,
} from '../../discovery';

export function createWorkspacePipelineDiscoveryDependencies(
  discovery: Pick<FileDiscovery, 'discover'>,
): WorkspacePipelineDiscoveryDependencies<IDiscoveredFile> {
  return {
    discover: async options => {
      const result = await discovery.discover(options);
      return {
        directories: result.directories,
        durationMs: result.durationMs,
        files: result.files,
        gitIgnoredPaths: result.gitIgnoredPaths,
        limitReached: result.limitReached,
        totalFound: result.totalFound ?? result.files.length,
      };
    },
  };
}

export async function discoverWorkspacePipelineFilesWithWarnings(
  dependencies: WorkspacePipelineDiscoveryDependencies<IDiscoveredFile>,
  workspaceRoot: string,
  config: WorkspacePipelineDiscoveryConfig,
  _filterPatterns: string[],
  _pluginFilterPatterns: string[],
  signal: AbortSignal | undefined,
  showWarningMessage: (message: string) => void,
): Promise<WorkspacePipelineDiscoveryResult<IDiscoveredFile>> {
  const discoveryResult = await discoverWorkspacePipelineFiles(
    dependencies,
    workspaceRoot,
    config,
    signal,
  );

  if (discoveryResult.limitReached) {
    showWarningMessage(
      formatWorkspacePipelineLimitReachedMessage(
        discoveryResult.totalFound,
        config.maxFiles,
      ),
    );
  }

  return discoveryResult;
}
