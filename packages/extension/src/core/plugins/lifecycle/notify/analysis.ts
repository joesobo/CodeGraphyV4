import type { IGraphData } from '../../../../shared/graph/contracts';
import type { ILifecyclePluginInfo } from '../contracts';

type AnalyzeFile = {
  absolutePath: string;
  relativePath: string;
  content: string;
};

function logLifecycleError(hook: string, pluginId: string, error: unknown): void {
  console.error(`[CodeGraphy] Error in ${hook} for ${pluginId}:`, error);
}

export async function notifyPreAnalyze(
  plugins: Map<string, ILifecyclePluginInfo>,
  files: AnalyzeFile[],
  workspaceRoot: string,
): Promise<void> {
  for (const info of plugins.values()) {
    if (!info.plugin.onPreAnalyze) {
      continue;
    }

    try {
      await info.plugin.onPreAnalyze(files, workspaceRoot);
    } catch (error) {
      logLifecycleError('onPreAnalyze', info.plugin.id, error);
    }
  }
}

export function notifyPostAnalyze(
  plugins: Map<string, ILifecyclePluginInfo>,
  graph: IGraphData,
): void {
  for (const info of plugins.values()) {
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
): void {
  for (const info of plugins.values()) {
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
