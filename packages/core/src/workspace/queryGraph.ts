import * as path from 'node:path';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { loadWorkspaceAnalysisDatabaseCache, readWorkspaceAnalysisDatabaseSnapshot } from '../graphCache/database/storage';
import { buildWorkspaceGraphDataFromAnalysis } from '../graph/data';
import { filterInactivePluginFileAnalysis, filterInactivePluginSnapshotFacts } from '../plugins/activityState/analysisFacts';
import { createDisabledPluginSet, createPluginActivityState } from '../plugins/activityState/model';
import type { CodeGraphyInstalledPluginCache } from '../plugins/installedCache';
import { CODEGRAPHY_MARKDOWN_PLUGIN_ID, readCodeGraphyWorkspaceSettings } from './settings';
import { normalizeWorkspaceQueryFacts } from './queryFacts';

function collectDirectoryPaths(filePaths: Iterable<string>): string[] {
  const directories = new Set<string>();
  for (const filePath of filePaths) {
    let directory = path.posix.dirname(filePath.replace(/\\/g, '/'));
    while (directory && directory !== '.') {
      directories.add(directory);
      directory = path.posix.dirname(directory);
    }
  }
  return [...directories].sort();
}

export function readWorkspaceQueryGraph(
  workspaceRoot: string,
  installedPluginCache: CodeGraphyInstalledPluginCache,
) {
  const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
  const cache = loadWorkspaceAnalysisDatabaseCache(workspaceRoot);
  const snapshot = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
  const activity = createPluginActivityState({
    settings,
    installedPlugins: installedPluginCache.plugins,
    builtInPluginIds: [CODEGRAPHY_MARKDOWN_PLUGIN_ID],
  });
  const activePluginIds = new Set(activity.activePluginIds);
  const fileAnalysis = new Map<string, IFileAnalysisResult>(
    Object.entries(cache.files).map(([filePath, entry]) => [filePath, entry.analysis]),
  );
  const graphData = buildWorkspaceGraphDataFromAnalysis({
    cacheFiles: cache.files,
    directoryPaths: collectDirectoryPaths(Object.keys(cache.files)),
    disabledPlugins: createDisabledPluginSet(settings),
    fileAnalysis: filterInactivePluginFileAnalysis(fileAnalysis, activePluginIds),
    getPluginForFile: () => undefined,
    showOrphans: settings.showOrphans,
    workspaceRoot,
  });

  return {
    graphData,
    snapshotFacts: normalizeWorkspaceQueryFacts(
      filterInactivePluginSnapshotFacts(snapshot, activePluginIds),
      workspaceRoot,
    ),
  };
}
