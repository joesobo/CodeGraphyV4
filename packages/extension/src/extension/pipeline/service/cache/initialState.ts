import type * as vscode from 'vscode';
import {
  createEmptyWorkspaceAnalysisCache,
  type IWorkspaceAnalysisCache,
} from '../../cache';

export function createWorkspacePipelineInitialCache(
  _workspaceFolders: typeof vscode.workspace.workspaceFolders,
): IWorkspaceAnalysisCache {
  return createEmptyWorkspaceAnalysisCache();
}
