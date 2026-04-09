import * as vscode from 'vscode';
import type { IGraphData } from '../../../../shared/graph/types';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { IGroup } from '../../../../shared/settings/groups';
import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';
import type { IPhysicsSettings } from '../../../../shared/settings/physics';
import type { IViewContext } from '../../../../core/views/contracts';
import type { IFileAnalysisResult } from '../../../../core/plugins/types/contracts';
import type { WorkspaceAnalysisDatabaseSnapshot } from '../../../pipeline/database/cache';
import { dispatchGraphViewPrimaryRouteMessage } from './routed';
import { dispatchGraphViewPrimaryStateMessage } from './stateful';

export interface GraphViewPrimaryMessageContext {
  getTimelineActive(): boolean;
  getCurrentCommitSha(): string | undefined;
  getUserGroups(): IGroup[];
  getDisabledPlugins(): Set<string>;
  getFilterPatterns(): string[];
  getGraphData(): IGraphData;
  getAnalyzer():
    | {
        lastFileAnalysis: ReadonlyMap<string, IFileAnalysisResult>;
        readStructuredAnalysisSnapshot?(): WorkspaceAnalysisDatabaseSnapshot;
      }
    | undefined;
  getViewContext(): IViewContext;
  openSelectedNode(nodeId: string): Promise<void>;
  activateNode(nodeId: string): Promise<void>;
  setFocusedFile(filePath: string | undefined): void;
  previewFileAtCommit(sha: string, filePath: string): Promise<void>;
  openFile(filePath: string): Promise<void>;
  revealInExplorer(filePath: string): Promise<void>;
  copyToClipboard(text: string): Promise<void>;
  deleteFiles(paths: string[]): Promise<void>;
  renameFile(filePath: string): Promise<void>;
  createFile(directory: string): Promise<void>;
  toggleFavorites(paths: string[]): Promise<void>;
  addToExclude(patterns: string[]): Promise<void>;
  indexAndSendData(): Promise<void>;
  analyzeAndSendData(): Promise<void>;
  refreshIndex(): Promise<void>;
  clearCacheAndRefresh(): Promise<void>;
  getFileInfo(filePath: string): Promise<void>;
  undo(): Promise<string | undefined>;
  redo(): Promise<string | undefined>;
  showInformationMessage(detail: string): void;
  setDepthMode(depthMode: boolean): Promise<void>;
  setDepthLimit(depthLimit: number): Promise<void>;
  getDepthMode(): boolean;
  updateDagMode(dagMode: DagMode): Promise<void>;
  updateNodeSizeMode(nodeSizeMode: NodeSizeMode): Promise<void>;
  indexRepository(): Promise<void>;
  jumpToCommit(sha: string): Promise<void>;
  resetTimeline(): Promise<void>;
  sendPhysicsSettings(): void;
  updatePhysicsSetting(key: keyof IPhysicsSettings, value: number): Promise<void>;
  resetPhysicsSettings(): Promise<void>;
  workspaceFolder: vscode.WorkspaceFolder | undefined;
  persistLegends(legends: IGroup[]): Promise<void>;
  recomputeGroups(): void;
  sendGroupsUpdated(): void;
  showOpenDialog(
    options: vscode.OpenDialogOptions,
  ): Thenable<readonly vscode.Uri[] | undefined>;
  createDirectory(uri: vscode.Uri): Thenable<void>;
  copyFile(
    source: vscode.Uri,
    destination: vscode.Uri,
    options?: { overwrite?: boolean },
  ): Thenable<void>;
  getConfig<T>(key: string, defaultValue: T): T;
  updateConfig(key: string, value: unknown): Promise<void>;
  sendGraphControls(): void;
  reprocessPluginFiles(pluginIds: readonly string[]): Promise<void>;
  getPluginFilterPatterns(): string[];
  sendMessage(message: unknown): void;
  applyViewTransform(): void;
  smartRebuild(id: string): void;
  resetAllSettings(): Promise<void>;
}

export interface GraphViewPrimaryMessageResult {
  handled: boolean;
  userGroups?: IGroup[];
  filterPatterns?: string[];
}

export async function dispatchGraphViewPrimaryMessage(
  message: WebviewToExtensionMessage,
  context: GraphViewPrimaryMessageContext,
): Promise<GraphViewPrimaryMessageResult> {
  const routedResult = await dispatchGraphViewPrimaryRouteMessage(message, context);
  if (routedResult.handled) {
    return routedResult;
  }

  return dispatchGraphViewPrimaryStateMessage(message, context);
}
