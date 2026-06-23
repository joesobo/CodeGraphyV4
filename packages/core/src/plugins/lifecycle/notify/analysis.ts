import type { IPluginAnalysisContext } from '@codegraphy-dev/plugin-api';
import type { IGraphData } from '../../../graph/contracts';
import type { ILifecyclePluginInfo } from '../contracts';
import {
  createWorkspacePluginAnalysisContext,
  withWorkspacePluginAnalysisOptions,
} from '../../context/workspace';

type AnalyzeFile = {
  absolutePath: string;
  relativePath: string;
  content: string;
};

function pluginMatchesFile(info: ILifecyclePluginInfo, relativePath: string): boolean {
  if (info.plugin.supportedExtensions.includes('*')) {
    return true;
  }

  const lowercasePath = relativePath.toLowerCase();
  return info.plugin.supportedExtensions.some((extension) =>
    lowercasePath.endsWith(extension.toLowerCase()),
  );
}

function getPluginFiles(
  info: ILifecyclePluginInfo,
  files: AnalyzeFile[],
): AnalyzeFile[] {
  return files.filter((file) => pluginMatchesFile(info, file.relativePath));
}

function logLifecycleError(hook: string, pluginId: string, error: unknown): void {
  console.error(`[CodeGraphy] Error in ${hook} for ${pluginId}:`, error);
}

export async function notifyPreAnalyze(
  plugins: Map<string, ILifecyclePluginInfo>,
  files: AnalyzeFile[],
  workspaceRoot: string,
  analysisContext: IPluginAnalysisContext = createWorkspacePluginAnalysisContext(workspaceRoot),
  disabledPlugins: ReadonlySet<string> = new Set(),
): Promise<void> {
  for (const info of plugins.values()) {
    if (disabledPlugins.has(info.plugin.id)) {
      continue;
    }

    if (!info.plugin.onPreAnalyze) {
      continue;
    }

    const pluginFiles = getPluginFiles(info, files);
    if (pluginFiles.length === 0) {
      continue;
    }

    try {
      await info.plugin.onPreAnalyze(
        pluginFiles,
        workspaceRoot,
        withWorkspacePluginAnalysisOptions(analysisContext, info.options),
      );
    } catch (error) {
      logLifecycleError('onPreAnalyze', info.plugin.id, error);
    }
  }
}

export function notifyPostAnalyze(
  plugins: Map<string, ILifecyclePluginInfo>,
  graph: IGraphData,
  disabledPlugins: ReadonlySet<string> = new Set(),
): void {
  for (const info of plugins.values()) {
    if (disabledPlugins.has(info.plugin.id)) {
      continue;
    }

    if (!info.plugin.onPostAnalyze) {
      continue;
    }

    try {
      info.plugin.onPostAnalyze(graph);
    } catch (error) {
      logLifecycleError('onPostAnalyze', info.plugin.id, error);
    }
  }
}

export function notifyGraphRebuild(
  plugins: Map<string, ILifecyclePluginInfo>,
  graph: IGraphData,
  disabledPlugins: ReadonlySet<string> = new Set(),
): void {
  for (const info of plugins.values()) {
    if (disabledPlugins.has(info.plugin.id)) {
      continue;
    }

    if (!info.plugin.onGraphRebuild) {
      continue;
    }

    try {
      info.plugin.onGraphRebuild(graph);
    } catch (error) {
      logLifecycleError('onGraphRebuild', info.plugin.id, error);
    }
  }
}
