import * as vscode from 'vscode';
import type { FileDiscovery, IDiscoveredFile } from '@codegraphy-dev/core';
import type { ICodeGraphyConfig } from '../../../../config/defaults';
import type { WorkspacePipelineDiscoveryResult } from '../../../discovery';
import {
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
} from '../../runtime/discovery';
import { readFilesExcludeRules } from '../../../../config/filesExclude/model';

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
  const workspaceResource = vscode.workspace.workspaceFolders
    ?.find(folder => folder.uri.fsPath === input.workspaceRoot)?.uri;
  const discoveryConfig = {
    ...config,
    filesExclude: config.respectFilesExclude && workspaceResource
      ? readFilesExcludeRules(vscode.workspace, workspaceResource)
      : [],
  };
  const discoveryResult = await discoverWorkspacePipelineFilesWithWarnings(
    createWorkspacePipelineDiscoveryDependencies(input.discovery),
    input.workspaceRoot,
    discoveryConfig,
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
