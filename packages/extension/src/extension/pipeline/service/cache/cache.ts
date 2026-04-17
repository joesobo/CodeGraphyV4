import type * as vscode from 'vscode';
import {
  createEmptyWorkspaceAnalysisCache,
  type IWorkspaceAnalysisCache,
} from '../../cache';
import { loadWorkspaceAnalysisDatabaseCache } from '../../database/cache/storage';
import { readWorkspacePipelineRoot } from '../../serviceAdapters';

export function createWorkspacePipelineInitialCache(
  workspaceFolders: typeof vscode.workspace.workspaceFolders,
): IWorkspaceAnalysisCache {
  const workspaceRoot = readWorkspacePipelineRoot(workspaceFolders);
  const repoCache = workspaceRoot
    ? loadWorkspaceAnalysisDatabaseCache(workspaceRoot)
    : undefined;

  return repoCache ?? createEmptyWorkspaceAnalysisCache();
}
