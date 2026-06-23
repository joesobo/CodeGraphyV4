import * as vscode from 'vscode';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { IPluginFilterPatternGroup } from '../../../../shared/protocol/extensionToWebview';
import type { IGroup } from '../../../../shared/settings/groups';
import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';
import type { IPhysicsSettings } from '../../../../shared/settings/physics';
import type { IViewContext } from '../../../../core/views/contracts';
import type { IFileAnalysisResult } from '../../../../core/plugins/types/contracts';
import type { WorkspaceAnalysisDatabaseSnapshot } from '../../../pipeline/database/cache/storage';
import { recordExtensionPerformanceEvent } from '../../../performance/marks';
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
  openInEditor(): void;
  revealInExplorer(filePath: string): Promise<void>;
  copyToClipboard(text: string): Promise<void>;
  deleteFiles(paths: string[]): Promise<void>;
  renameFile(filePath: string): Promise<void>;
  createFile(directory: string): Promise<string | void>;
  createFolder(directory: string): Promise<string | void>;
  toggleFavorites(paths: string[]): Promise<void>;
  addToExclude(patterns: string[]): Promise<void>;
  indexAndSendData(): Promise<void>;
  analyzeAndSendData(): Promise<void>;
  refreshIndex(): Promise<void>;
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
  resetAllSettings(): Promise<void>;
}

export interface GraphViewPrimaryMessageResult {
  handled: boolean;
  userGroups?: IGroup[];
  filterPatterns?: string[];
}

function recordAcceptanceLiveUpdateSaveStage(
  stage: string,
  detail: Record<string, unknown>,
): void {
  recordExtensionPerformanceEvent(`graphWebview.acceptanceLiveUpdateSave.${stage}`, detail);
}

async function runAcceptanceLiveUpdateSaveStage<T>(
  stage: string,
  filePath: string,
  action: () => PromiseLike<T>,
): Promise<T> {
  const startedAt = Date.now();
  const result = await action();
  recordAcceptanceLiveUpdateSaveStage(stage, {
    durationMs: Date.now() - startedAt,
    filePath,
  });
  return result;
}

async function saveAcceptanceLiveUpdateFile(filePath: string): Promise<void> {
  const startedAt = Date.now();
  recordAcceptanceLiveUpdateSaveStage('start', { filePath });
  try {
    const document = await runAcceptanceLiveUpdateSaveStage(
      'openDocument',
      filePath,
      () => vscode.workspace.openTextDocument(vscode.Uri.file(filePath)),
    );
    const editor = await runAcceptanceLiveUpdateSaveStage(
      'showDocument',
      filePath,
      () => vscode.window.showTextDocument(document, {
        preserveFocus: true,
        preview: false,
      }),
    );
    await runAcceptanceLiveUpdateSaveStage('edit', filePath, () =>
      editor.edit(editBuilder => {
        editBuilder.insert(
          new vscode.Position(document.lineCount, 0),
          `\n// CodeGraphy live update perf marker ${Date.now()}\n`,
        );
      }),
    );
    await runAcceptanceLiveUpdateSaveStage('save', filePath, () => document.save());
    recordAcceptanceLiveUpdateSaveStage('completed', {
      durationMs: Date.now() - startedAt,
      filePath,
    });
  } catch (error) {
    recordAcceptanceLiveUpdateSaveStage('failed', {
      durationMs: Date.now() - startedAt,
      filePath,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function dispatchGraphViewPrimaryMessage(
  message: WebviewToExtensionMessage,
  context: GraphViewPrimaryMessageContext,
): Promise<GraphViewPrimaryMessageResult> {
  if (message.type === 'PERF_SAVE_LIVE_UPDATE_FILE') {
    if (process.env.CODEGRAPHY_ACCEPTANCE === '1') {
      await saveAcceptanceLiveUpdateFile(message.payload.path);
      return { handled: true };
    }

    return { handled: false };
  }

  const routedResult = await dispatchGraphViewPrimaryRouteMessage(message, context);
  if (routedResult.handled) {
    return routedResult;
  }

  return dispatchGraphViewPrimaryStateMessage(message, context);
}
