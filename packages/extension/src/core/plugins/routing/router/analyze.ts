import type { IFileAnalysisResult, IProjectedConnection } from '../../types/contracts';
import { getPluginsForFile, type IRoutablePluginInfo } from './lookups';
import {
  createEmptyFileAnalysisResult,
  mergeFileAnalysisResults,
} from './results/merge';
import {
  toProjectedConnectionsFromFileAnalysis,
  withPluginProvenance,
} from './results/project';

export type CoreFileAnalysisResultProvider = (
  filePath: string,
  content: string,
  workspaceRoot: string,
) => Promise<IFileAnalysisResult | null>;

/**
 * Analyzes a file using the appropriate plugin.
 */
export async function analyzeFile(
  filePath: string,
  content: string,
  workspaceRoot: string,
  plugins: Map<string, IRoutablePluginInfo>,
  extensionMap: Map<string, string[]>,
  coreAnalyzeFileResult?: CoreFileAnalysisResultProvider,
): Promise<IProjectedConnection[]> {
  const analysis = await analyzeFileResult(
    filePath,
    content,
    workspaceRoot,
    plugins,
    extensionMap,
    coreAnalyzeFileResult,
  );
  return analysis ? toProjectedConnectionsFromFileAnalysis(analysis) : [];
}

export async function analyzeFileResult(
  filePath: string,
  content: string,
  workspaceRoot: string,
  plugins: Map<string, IRoutablePluginInfo>,
  extensionMap: Map<string, string[]>,
  coreAnalyzeFileResult?: CoreFileAnalysisResultProvider,
): Promise<IFileAnalysisResult | null> {
  const matchingPlugins = getPluginsForFile(filePath, plugins, extensionMap);
  const coreResult = await coreAnalyzeFileResult?.(filePath, content, workspaceRoot) ?? null;
  const normalizedCoreResult = coreResult
    ? mergeFileAnalysisResults(createEmptyFileAnalysisResult(filePath), coreResult)
    : null;

  if (matchingPlugins.length === 0) {
    return normalizedCoreResult;
  }

  let mergedResult = normalizedCoreResult ?? createEmptyFileAnalysisResult(filePath);

  for (let index = matchingPlugins.length - 1; index >= 0; index -= 1) {
    const plugin = matchingPlugins[index];
    if (!plugin.analyzeFile) {
      continue;
    }

    try {
      const pluginResult = withPluginProvenance(
        plugin,
        await plugin.analyzeFile(filePath, content, workspaceRoot),
      );

      mergedResult = mergeFileAnalysisResults(mergedResult, pluginResult);
    } catch (error) {
      console.error(`[CodeGraphy] Error analyzing ${filePath} with ${plugin.id}:`, error);
    }
  }

  return mergedResult;
}
