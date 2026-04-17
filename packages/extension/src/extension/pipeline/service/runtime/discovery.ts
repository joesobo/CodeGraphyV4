import type { IDiscoveredFile } from '../../../../core/discovery/contracts';
import type { FileDiscovery } from '../../../../core/discovery/file/service';
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
        durationMs: result.durationMs,
        files: result.files,
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
  filterPatterns: string[],
  pluginFilterPatterns: string[],
  signal: AbortSignal | undefined,
  showWarningMessage: (message: string) => void,
): Promise<WorkspacePipelineDiscoveryResult<IDiscoveredFile>> {
  const discoveryResult = await discoverWorkspacePipelineFiles(
    dependencies,
    workspaceRoot,
    config,
    filterPatterns,
    pluginFilterPatterns,
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
