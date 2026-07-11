import type * as vscode from 'vscode';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { IPluginFilterPatternGroup } from '../../../../shared/protocol/extensionToWebview';
import type { IPluginUpdateImpactPolicy } from '@codegraphy-dev/plugin-api';
import type { IGroup } from '../../../../shared/settings/groups';
import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';
import type { IPhysicsSettings } from '../../../../shared/settings/physics';
import type { IViewContext } from '../../../../core/views/contracts';
import type { IFileAnalysisResult } from '../../../../core/plugins/types/contracts';
import type { WorkspaceAnalysisDatabaseSnapshot } from '../../../pipeline/database/cache/storage';
import type { PluginGraphWorkRequest } from '../settingsMessages/pluginGraphWork';
import { dispatchGraphViewPrimaryRouteMessage } from './routed';
import { dispatchGraphViewPrimaryStateMessage } from './stateful';

export interface GraphViewPrimaryMessageContext {
  getTimelineActive(): boolean;
  getCurrentCommitSha(): string | undefined;
  getCanMutateGraphRevision(): boolean;
  getUserGroups(): IGroup[];
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
  canOpenPath(filePath: string): boolean;
  setFocusedFile(filePath: string | undefined): void;
  previewFileAtCommit(sha: string, filePath: string): Promise<void>;
  openFile(filePath: string): Promise<void>;
  openFileToSide(filePath: string): Promise<void>;
  findInFolder(filePath: string): Promise<void>;
  closeFileEditor(filePath: string): Promise<void>;
  openFileWith(filePath: string): Promise<void>;
  openInEditor(): void;
  revealInExplorer(filePath: string): Promise<void>;
  copyToClipboard(text: string): Promise<void>;
  cutFiles(paths: string[]): Promise<void>;
  copyFiles(paths: string[]): Promise<void>;
  pasteFiles(directory: string): Promise<void>;
  deleteFiles(paths: string[]): Promise<void>;
  renameFile(filePath: string): Promise<void>;
  createFile(directory: string): Promise<string | void>;
  createFolder(directory: string): Promise<string | void>;
  toggleFavorites(paths: string[]): Promise<void>;
  addToExclude(patterns: string[]): Promise<void>;
  indexAndSendData(): Promise<void>;
  analyzeAndSendData(): Promise<void>;
  refreshIndex(): Promise<void>;
  hydrateGraphScope(): Promise<boolean>;
  refreshAnalysisScope(): Promise<void>;
  clearCacheAndRefresh(): Promise<void>;
  getFileInfo(filePath: string): Promise<void>;
  undo(): Promise<string | undefined>;
  redo(): Promise<string | undefined>;
  showInformationMessage(detail: string): void;
  showWarningMessage(
    message: string,
    options: vscode.MessageOptions,
    deleteAction: string,
  ): Thenable<'Delete' | undefined>;
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
  persistDefaultLegendVisibility(legendId: string, visible: boolean): Promise<void>;
  persistDefaultLegendVisibilityBatch(legendVisibility: Record<string, boolean>): Promise<void>;
  persistLegendOrder(legendIds: string[]): Promise<void>;
  recomputeGroups(): void;
  sendGroupsUpdated(): void;
  showOpenDialog(
    options: vscode.OpenDialogOptions,
  ): Thenable<readonly vscode.Uri[] | undefined>;
  createDirectory(uri: vscode.Uri): Thenable<void>;
  writeFile(uri: vscode.Uri, content: Uint8Array): Thenable<void>;
  asWebviewUri?(uri: vscode.Uri): { toString(): string };
  copyFile(
    source: vscode.Uri,
    destination: vscode.Uri,
    options?: { overwrite?: boolean },
  ): Thenable<void>;
  getConfig<T>(key: string, defaultValue: T): T;
  updateConfig(key: string, value: unknown): Promise<void>;
  getInstalledPluginDefaultOptions?(pluginId: string): Record<string, unknown> | undefined;
  getInstalledPluginUpdateImpact?(pluginId: string): IPluginUpdateImpactPolicy | undefined;
  reloadWorkspacePlugins(): Promise<void>;
  syncWorkspacePlugins?(): Promise<void>;
  sendPluginStatuses?(): void;
  sendContextMenuItems(): void;
  sendPluginToolbarActions?(): void;
  sendGraphViewContributionStatuses?(): void;
  sendPluginWebviewInjections(): void;
  sendGraphControls(): void;
  reprocessGraphScope(): Promise<void>;
  reprocessPluginFiles(pluginIds: readonly string[]): Promise<void>;
  getPluginFilterPatterns(): string[];
  getPluginFilterGroups(): IPluginFilterPatternGroup[];
  sendMessage(message: unknown): void;
  applyViewTransform(): void;
  smartRebuild(id: string): void;
  schedulePluginGraphWork?(request: PluginGraphWorkRequest): void;
  cancelScheduledPluginGraphWork?(): void;
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
