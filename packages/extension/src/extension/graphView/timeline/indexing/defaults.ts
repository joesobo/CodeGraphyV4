import * as vscode from 'vscode';
import { GitHistoryAnalyzer } from '../../../gitHistory/analyzer';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import type { GraphViewProviderTimelineDependencies } from '../provider/indexing';
import { getCodeGraphyConfiguration } from '../../../repoSettings/current';
import {
  buildGraphViewTimelineGraphData,
  type GraphViewTimelineGraphOptions,
} from './filtering';
import { indexGraphViewRepository } from './repository';
import { sendCachedGraphViewTimeline } from '../playback';
import { readFilesExcludeRules } from '../../../config/filesExclude/model';

export function createDefaultGraphViewProviderTimelineDependencies(): GraphViewProviderTimelineDependencies {
  return {
    getWorkspaceFolder: () => vscode.workspace.workspaceFolders?.[0],
    getShowOrphans: () =>
      getCodeGraphyConfiguration().get<boolean>('showOrphans', true),
    getMaxCommits: () =>
      getCodeGraphyConfiguration().get<number>('timeline.maxCommits', 500),
    getDisabledCustomFilterPatterns: () =>
      getCodeGraphyConfiguration().get<string[]>('disabledCustomFilterPatterns', []),
    getDisabledPluginFilterPatterns: () =>
      getCodeGraphyConfiguration().get<string[]>('disabledPluginFilterPatterns', []),
    verifyGitRepository: async cwd => {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);
      await execFileAsync('git', ['rev-parse', '--git-dir'], { cwd });
    },
    createGitAnalyzer: (context, registry, workspaceRoot, mergedExclude) =>
      new GitHistoryAnalyzer(
        context,
        registry as PluginRegistry,
        workspaceRoot,
        mergedExclude,
        getCodeGraphyConfiguration().get<boolean>('respectFilesExclude', true)
          ? readFilesExcludeRules(vscode.workspace, vscode.Uri.file(workspaceRoot))
          : [],
      ),
    showErrorMessage: message => {
      vscode.window.showErrorMessage(message);
    },
    showInformationMessage: message => {
      vscode.window.showInformationMessage(message);
    },
    buildTimelineGraphData: (rawGraphData, options) =>
      buildGraphViewTimelineGraphData(rawGraphData, options as GraphViewTimelineGraphOptions),
    indexRepository: indexGraphViewRepository,
    sendCachedTimeline: sendCachedGraphViewTimeline,
    logError: (message, error) => {
      console.error(message, error);
    },
  };
}
