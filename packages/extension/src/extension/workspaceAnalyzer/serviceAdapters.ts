import type * as vscode from 'vscode';
import type { IDiscoveredFile } from '../../core/discovery/contracts';
import type { FileDiscovery } from '../../core/discovery/file/service';
import type { EventBus } from '../../core/plugins/eventBus';
import type { PluginRegistry } from '../../core/plugins/registry/manager';
import type { IConnection } from '../../core/plugins/types/contracts';
import type { IGraphData } from '../../shared/graph/types';
import type { IWorkspaceAnalysisCache } from './cache';
import {
  analyzeWorkspaceAnalyzerSourceFiles,
  type WorkspaceAnalyzerFilesSource,
} from './analysis/files';
import { preAnalyzeWorkspaceAnalyzerFiles } from './analysis/preAnalyze';
import {
  buildWorkspaceAnalyzerGraphForSource,
  type WorkspaceAnalyzerGraphSource,
} from './graph/build';
import {
  getWorkspaceAnalyzerFileStat,
  getWorkspaceAnalyzerRoot,
} from './io';

export async function preAnalyzeWorkspaceAnalyzerPlugins(
  files: IDiscoveredFile[],
  workspaceRoot: string,
  registry: Pick<PluginRegistry, 'notifyPreAnalyze'>,
  discovery: Pick<FileDiscovery, 'readContent'>,
  signal?: AbortSignal,
): Promise<void> {
  await preAnalyzeWorkspaceAnalyzerFiles(
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

export function analyzeWorkspaceAnalyzerFiles(
  cache: IWorkspaceAnalysisCache,
  discovery: FileDiscovery,
  eventBus: EventBus | undefined,
  registry: PluginRegistry,
  getFileStat: (filePath: string) => Promise<{ mtime: number; size: number } | null>,
  files: IDiscoveredFile[],
  workspaceRoot: string,
  signal?: AbortSignal,
): Promise<Map<string, IConnection[]>> {
  const source: WorkspaceAnalyzerFilesSource = {
    _cache: cache,
    _discovery: discovery,
    _eventBus: eventBus,
    _getFileStat: getFileStat,
    _registry: registry,
  };

  return analyzeWorkspaceAnalyzerSourceFiles(
    source,
    files,
    workspaceRoot,
    message => {
      console.log(message);
    },
    signal,
  );
}

export function buildWorkspaceAnalyzerGraphData(
  cache: IWorkspaceAnalysisCache,
  context: vscode.ExtensionContext,
  registry: PluginRegistry,
  fileConnections: Map<string, IConnection[]>,
  workspaceRoot: string,
  showOrphans: boolean,
  disabledSources: Set<string> = new Set(),
  disabledPlugins: Set<string> = new Set(),
): IGraphData {
  const source: WorkspaceAnalyzerGraphSource = {
    _cache: cache,
    _context: context,
    _registry: registry,
  };

  return buildWorkspaceAnalyzerGraphForSource(
    source,
    fileConnections,
    workspaceRoot,
    showOrphans,
    disabledSources,
    disabledPlugins,
  );
}

export function readWorkspaceAnalyzerRoot(
  workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined,
): string | undefined {
  return getWorkspaceAnalyzerRoot(workspaceFolders);
}

export function readWorkspaceAnalyzerFileStat(
  filePath: string,
  fileSystem: vscode.FileSystem,
): Promise<{ mtime: number; size: number } | null> {
  return getWorkspaceAnalyzerFileStat(filePath, fileSystem);
}
