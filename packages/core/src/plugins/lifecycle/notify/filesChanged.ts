import type { IPluginAnalysisContext } from '@codegraphy-dev/plugin-api';
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

function collectAdditionalFilePaths(
  filePaths: readonly unknown[] | void,
  additionalFilePaths: Set<string>,
): void {
  for (const filePath of filePaths ?? []) {
    if (typeof filePath === 'string' && filePath.length > 0) {
      additionalFilePaths.add(filePath);
    }
  }
}

export interface IPluginFilesChangedResult {
  additionalFilePaths: string[];
  requiresFullRefresh: boolean;
}

export async function notifyFilesChanged(
  plugins: Map<string, ILifecyclePluginInfo>,
  files: AnalyzeFile[],
  workspaceRoot: string,
  analysisContext: IPluginAnalysisContext = createWorkspacePluginAnalysisContext(workspaceRoot),
  disabledPlugins: ReadonlySet<string> = new Set(),
): Promise<IPluginFilesChangedResult> {
  const additionalFilePaths = new Set<string>();
  let requiresFullRefresh = false;

  for (const info of plugins.values()) {
    if (disabledPlugins.has(info.plugin.id)) {
      continue;
    }

    if (info.plugin.onFilesChanged) {
      try {
        const nextPaths = await info.plugin.onFilesChanged(
          files,
          workspaceRoot,
          withWorkspacePluginAnalysisOptions(analysisContext, info.options),
        );
        collectAdditionalFilePaths(nextPaths, additionalFilePaths);
      } catch (error) {
        console.error(`[CodeGraphy] Error in onFilesChanged for ${info.plugin.id}:`, error);
        requiresFullRefresh = true;
      }
      continue;
    }

    const pluginFiles = getPluginFiles(info, files);
    if (pluginFiles.length > 0) {
      if (info.plugin.onPreAnalyze) {
        requiresFullRefresh = true;
      }
    }
  }

  return {
    additionalFilePaths: [...additionalFilePaths],
    requiresFullRefresh,
  };
}
