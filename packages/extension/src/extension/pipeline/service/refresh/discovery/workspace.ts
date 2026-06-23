import * as vscode from 'vscode';
import type { FileDiscovery, IDiscoveredFile } from '@codegraphy-dev/core';
import type { ICodeGraphyConfig } from '../../../../config/defaults';
import type { WorkspacePipelineDiscoveryResult } from '../../../discovery';
import {
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
} from '../../runtime/discovery';

interface RefreshDiscoveryConfigReader {
  getAll(): ICodeGraphyConfig;
}

interface RefreshWorkspaceFileDiscoveryInput {
  configReader: RefreshDiscoveryConfigReader;
  disabledPlugins: Set<string>;
  discovery: Pick<FileDiscovery, 'discover'>;
  filterPatterns: readonly string[];
  getPluginFilterPatterns(disabledPlugins: Set<string>): string[];
  signal?: AbortSignal;
  workspaceRoot: string;
}

interface RefreshWorkspaceFileDiscoveryResult {
  config: ICodeGraphyConfig;
  discoveryResult: WorkspacePipelineDiscoveryResult<IDiscoveredFile>;
}

export async function discoverRefreshWorkspaceFiles(
  input: RefreshWorkspaceFileDiscoveryInput,
): Promise<RefreshWorkspaceFileDiscoveryResult> {
  const config = input.configReader.getAll();
  const disabledCustomPatterns = new Set(config.disabledCustomFilterPatterns);
  const disabledPluginPatterns = new Set(config.disabledPluginFilterPatterns);
  const discoveryResult = await discoverWorkspacePipelineFilesWithWarnings(
    createWorkspacePipelineDiscoveryDependencies(input.discovery),
    input.workspaceRoot,
    config,
    input.filterPatterns.filter(pattern => !disabledCustomPatterns.has(pattern)),
    input.getPluginFilterPatterns(input.disabledPlugins)
      .filter(pattern => !disabledPluginPatterns.has(pattern)),
    input.signal,
    message => {
      vscode.window.showWarningMessage(message);
    },
  );

  return { config, discoveryResult };
}
