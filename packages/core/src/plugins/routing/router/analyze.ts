import type {
  IFileAnalysisResult,
  IPluginAnalysisContext,
} from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../../../analysis/projectedConnection';
import { getPluginInfosForFile, type IRoutablePluginInfo } from './lookups';
import {
  createEmptyFileAnalysisResult,
  mergeFileAnalysisResults,
} from './results/merge';
import {
  toProjectedConnectionsFromFileAnalysis,
  withPluginProvenance,
} from './results/project';
import {
  createWorkspacePluginAnalysisContext,
  withWorkspacePluginAnalysisOptions,
} from '../../context/workspace';

export type CoreFileAnalysisResultProvider = (
  filePath: string,
  content: string,
  workspaceRoot: string,
  analysisContext: IPluginAnalysisContext,
) => Promise<IFileAnalysisResult | null>;

export interface AnalyzeFileResultOptions {
  disabledPlugins?: ReadonlySet<string>;
  onPluginError?: (pluginId: string, error: unknown, hook: 'analyzeFile') => void;
  pluginIds?: ReadonlySet<string>;
}

function filterPluginInfosBySelection(
  pluginInfos: IRoutablePluginInfo[],
  options: AnalyzeFileResultOptions,
): IRoutablePluginInfo[] {
  if (!options.pluginIds) {
    return pluginInfos.filter(pluginInfo => !options.disabledPlugins?.has(pluginInfo.plugin.id));
  }

  return pluginInfos.filter(pluginInfo =>
    options.pluginIds?.has(pluginInfo.plugin.id)
    && !options.disabledPlugins?.has(pluginInfo.plugin.id)
  );
}

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
  analysisContext?: IPluginAnalysisContext,
  options: AnalyzeFileResultOptions = {},
): Promise<IProjectedConnection[]> {
  const analysis = await analyzeFileResult(
    filePath,
    content,
    workspaceRoot,
    plugins,
    extensionMap,
    coreAnalyzeFileResult,
    analysisContext,
    options,
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
  analysisContext: IPluginAnalysisContext = createWorkspacePluginAnalysisContext(workspaceRoot),
  options: AnalyzeFileResultOptions = {},
): Promise<IFileAnalysisResult | null> {
  const matchingPlugins = filterPluginInfosBySelection(
    getPluginInfosForFile(filePath, plugins, extensionMap),
    options,
  );
  const coreResult = await coreAnalyzeFileResult?.(filePath, content, workspaceRoot, analysisContext) ?? null;
  const normalizedCoreResult = coreResult
    ? mergeFileAnalysisResults(createEmptyFileAnalysisResult(filePath), coreResult)
    : null;

  if (matchingPlugins.length === 0) {
    return normalizedCoreResult;
  }

  let mergedResult = normalizedCoreResult ?? createEmptyFileAnalysisResult(filePath);

  for (let index = matchingPlugins.length - 1; index >= 0; index -= 1) {
    const pluginInfo = matchingPlugins[index];
    const plugin = pluginInfo.plugin;
    if (!plugin.analyzeFile) {
      continue;
    }

    try {
      const pluginResult = withPluginProvenance(
        plugin,
        await plugin.analyzeFile(
          filePath,
          content,
          workspaceRoot,
          withWorkspacePluginAnalysisOptions(analysisContext, pluginInfo.options),
        ),
      );

      mergedResult = mergeFileAnalysisResults(mergedResult, pluginResult);
    } catch (error) {
      if (options.onPluginError) {
        options.onPluginError(plugin.id, error, 'analyzeFile');
      } else {
        console.error(`[CodeGraphy] Error analyzing ${filePath} with ${plugin.id}:`, error);
      }
    }
  }

  return mergedResult;
}
