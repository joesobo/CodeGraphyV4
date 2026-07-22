import type { IWorkspaceFileAnalysisResult } from '../analysis/fileAnalysis';
import { analyzeWorkspacePipelineFiles } from '../analysis/workspaceFiles';
import type { IDiscoveredFile } from '../discovery/contracts';
import { getFileStat } from './fileStat';
import type { WorkspaceEngineRuntime, WorkspaceEngineState } from './engineRuntime';

export async function readAnalysisFiles(
  runtime: WorkspaceEngineRuntime,
  files: readonly IDiscoveredFile[],
): Promise<Array<{ absolutePath: string; relativePath: string; content: string }>> {
  return Promise.all(files.map(async file => ({
    absolutePath: file.absolutePath,
    relativePath: file.relativePath,
    content: await runtime.discovery.readContent(file),
  })));
}

export async function analyzeWorkspaceEngineChangedFiles(
  runtime: WorkspaceEngineRuntime,
  files: IDiscoveredFile[],
  disabledPlugins: ReadonlySet<string>,
): Promise<IWorkspaceFileAnalysisResult> {
  const { discovery, options, state, workspaceRoot } = runtime;
  return analyzeWorkspacePipelineFiles({
    analyzeFile: async (absolutePath, content, rootPath) => (
      await state.registry?.analyzeFileResult(
        absolutePath,
        content,
        rootPath,
        undefined,
        { disabledPlugins },
      ) ?? { filePath: absolutePath, relations: [] }
    ),
    cache: state.cache,
    files,
    getFileStat,
    logInfo: options.logInfo ?? (() => undefined),
    onProgress: progress => options.onProgress?.({
      phase: 'Applying Changes',
      current: progress.current,
      total: progress.total,
    }),
    readContent: file => discovery.readContent(file),
    signal: options.signal,
    workspaceRoot,
  });
}

export function applyWorkspaceEngineAnalysisResult(
  state: WorkspaceEngineState,
  analysisResult: IWorkspaceFileAnalysisResult,
): void {
  for (const [filePath, analysis] of analysisResult.fileAnalysis) state.fileAnalysis.set(filePath, analysis);
  for (const [filePath, connections] of analysisResult.fileConnections) state.fileConnections.set(filePath, connections);
}
