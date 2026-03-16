import * as vscode from 'vscode';
import { GitHistoryAnalyzer } from '../GitHistoryAnalyzer';
import type { GraphViewProviderTimelineDependencies } from './providerTimeline';
import { buildGraphViewTimelineGraphData } from './timelineGraph';
import { indexGraphViewRepository } from './timelineIndex';
import { sendCachedGraphViewTimeline } from './timelinePlayback';

export function createDefaultGraphViewProviderTimelineDependencies(): GraphViewProviderTimelineDependencies {
  return {
    getWorkspaceFolder: () => vscode.workspace.workspaceFolders?.[0],
    getShowOrphans: () =>
      vscode.workspace.getConfiguration('codegraphy').get<boolean>('showOrphans', true),
    getMaxCommits: () =>
      vscode.workspace.getConfiguration('codegraphy').get<number>('timeline.maxCommits', 500),
    verifyGitRepository: async cwd => {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);
      await execFileAsync('git', ['rev-parse', '--git-dir'], { cwd });
    },
    createGitAnalyzer: (context, registry, workspaceRoot, mergedExclude) =>
      new GitHistoryAnalyzer(context, registry as never, workspaceRoot, mergedExclude),
    showErrorMessage: message => {
      vscode.window.showErrorMessage(message);
    },
    showInformationMessage: message => {
      vscode.window.showInformationMessage(message);
    },
    buildTimelineGraphData: (rawGraphData, options) =>
      buildGraphViewTimelineGraphData(rawGraphData, options as never),
    indexRepository: indexGraphViewRepository,
    sendCachedTimeline: sendCachedGraphViewTimeline,
    logError: (message, error) => {
      console.error(message, error);
    },
  };
}
