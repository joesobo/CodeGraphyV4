import type { ILifecyclePluginInfo } from '../contracts.js';

export type AnalyzeFile = {
  absolutePath: string;
  relativePath: string;
  content: string;
};

export function getPluginFiles(
  info: ILifecyclePluginInfo,
  files: AnalyzeFile[],
): AnalyzeFile[] {
  return files.filter((file) => pluginMatchesFile(info, file.relativePath));
}

function pluginMatchesFile(info: ILifecyclePluginInfo, relativePath: string): boolean {
  if (info.plugin.supportedExtensions.includes('*')) {
    return true;
  }

  const lowercasePath = relativePath.toLowerCase();
  return info.plugin.supportedExtensions.some((extension) =>
    lowercasePath.endsWith(extension.toLowerCase()),
  );
}
