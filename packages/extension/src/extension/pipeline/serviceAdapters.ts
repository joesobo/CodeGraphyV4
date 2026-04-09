import type * as vscode from 'vscode';
import type { IDiscoveredFile } from '../../core/discovery/contracts';
import type { FileDiscovery } from '../../core/discovery/file/service';
import type { EventBus } from '../../core/plugins/events/bus';
import type { PluginRegistry } from '../../core/plugins/registry/manager';
import type { IConnection } from '../../core/plugins/types/contracts';
import type { IGraphData } from '../../shared/graph/types';
import type { IWorkspaceAnalysisCache } from './cache';
import type { IWorkspaceFileAnalysisResult } from './fileAnalysis';
import {
  analyzeWorkspacePipelineSourceFiles,
  type WorkspacePipelineFilesSource,
} from './analysis/files';
import { preAnalyzeWorkspacePipelineFiles } from './analysis/preAnalyze';
import {
  buildWorkspacePipelineGraphForSource,
  type WorkspacePipelineGraphSource,
} from './graph/build';
import {
  getWorkspacePipelineFileStat,
  getWorkspacePipelineRoot,
} from './io';

export async function preAnalyzeWorkspacePipelinePlugins(
  files: IDiscoveredFile[],
  workspaceRoot: string,
  registry: Pick<PluginRegistry, 'notifyPreAnalyze'>,
  discovery: Pick<FileDiscovery, 'readContent'>,
  signal?: AbortSignal,
): Promise<void> {
  await preAnalyzeWorkspacePipelineFiles(
    files,
    workspaceRoot,
    {
      notifyPreAnalyze: (v2Files, rootPath) =>
        registry.notifyPreAnalyze(v2Files, rootPath),
      readContent: file => discovery.readContent(file),
    },
    signal,
  );
}

export function analyzeWorkspacePipelineFiles(
  cache: IWorkspaceAnalysisCache,
  discovery: FileDiscovery,
  eventBus: EventBus | undefined,
  registry: PluginRegistry,
  getFileStat: (filePath: string) => Promise<{ mtime: number; size: number } | null>,
  files: IDiscoveredFile[],
  workspaceRoot: string,
  onProgress?: (progress: { current: number; total: number; filePath: string }) => void,
  signal?: AbortSignal,
): Promise<IWorkspaceFileAnalysisResult> {
  const source: WorkspacePipelineFilesSource = {
    _cache: cache,
    _discovery: discovery,
    _eventBus: eventBus,
    _getFileStat: getFileStat,
    _registry: registry,
  };

  return analyzeWorkspacePipelineSourceFiles(
    source,
    files,
    workspaceRoot,
    message => {
      console.log(message);
    },
    onProgress,
    signal,
  );
}

export function buildWorkspacePipelineGraphData(
  cache: IWorkspaceAnalysisCache,
  context: vscode.ExtensionContext,
  registry: PluginRegistry,
  fileConnections: Map<string, IConnection[]>,
  workspaceRoot: string,
  showOrphans: boolean,
  disabledPlugins: Set<string> = new Set(),
): IGraphData {
  const source: WorkspacePipelineGraphSource = {
    _cache: cache,
    _context: context,
    _registry: registry,
  };

  return buildWorkspacePipelineGraphForSource(
    source,
    fileConnections,
    workspaceRoot,
    showOrphans,
    disabledPlugins,
  );
}

export function readWorkspacePipelineRoot(
  workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined,
): string | undefined {
  return getWorkspacePipelineRoot(workspaceFolders);
}

export function readWorkspacePipelineFileStat(
  filePath: string,
  fileSystem: vscode.FileSystem,
): Promise<{ mtime: number; size: number } | null> {
  return getWorkspacePipelineFileStat(filePath, fileSystem);
}
