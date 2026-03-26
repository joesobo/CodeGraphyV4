import * as vscode from 'vscode';
import type {
  DagMode,
  IGraphData,
  IGroup,
  IPhysicsSettings,
  NodeSizeMode,
  WebviewToExtensionMessage,
} from '../../../../shared/contracts';
import type { IViewContext } from '../../../../core/views/types';
import { saveExportedJpeg } from '../../../export/saveJpeg';
import { saveExportedJson } from '../../../export/saveJson';
import { saveExportedMarkdown } from '../../../export/saveMarkdown';
import { saveExportedPng } from '../../../export/savePng';
import { saveExportedSvg } from '../../../export/saveSvg';
import { applyCommandMessage } from '../commands';
import { applyExportMessage } from '../exports';
import { applyGroupMessage, type GraphViewGroupMessageState } from '../groups';
import { applyNodeFileMessage, type GraphViewNodeFileHandlers } from '../nodeFile';
import { applyPhysicsMessage } from '../physics';
import { applySettingsMessage, type GraphViewSettingsMessageState } from '../settings';
import { applyTimelineMessage } from '../timeline';

export interface GraphViewPrimaryMessageContext {
  getTimelineActive(): boolean;
  getCurrentCommitSha(): string | undefined;
  getUserGroups(): IGroup[];
  getActiveViewId(): string;
  getDisabledPlugins(): Set<string>;
  getDisabledRules(): Set<string>;
  getFilterPatterns(): string[];
  getGraphData(): IGraphData;
  getViewContext(): IViewContext;
  openSelectedNode(nodeId: string): Promise<void>;
  activateNode(nodeId: string): Promise<void>;
  previewFileAtCommit(sha: string, filePath: string): Promise<void>;
  openFile(filePath: string): Promise<void>;
  revealInExplorer(filePath: string): Promise<void>;
  copyToClipboard(text: string): Promise<void>;
  deleteFiles(paths: string[]): Promise<void>;
  renameFile(filePath: string): Promise<void>;
  createFile(directory: string): Promise<void>;
  toggleFavorites(paths: string[]): Promise<void>;
  addToExclude(patterns: string[]): Promise<void>;
  analyzeAndSendData(): Promise<void>;
  getFileInfo(filePath: string): Promise<void>;
  undo(): Promise<string | undefined>;
  redo(): Promise<string | undefined>;
  showInformationMessage(detail: string): void;
  changeView(viewId: string): Promise<void>;
  setDepthLimit(depthLimit: number): Promise<void>;
  updateDagMode(dagMode: DagMode): Promise<void>;
  updateNodeSizeMode(nodeSizeMode: NodeSizeMode): Promise<void>;
  indexRepository(): Promise<void>;
  jumpToCommit(sha: string): Promise<void>;
  sendPhysicsSettings(): void;
  updatePhysicsSetting(key: keyof IPhysicsSettings, value: number): Promise<void>;
  resetPhysicsSettings(): Promise<void>;
  workspaceFolder: vscode.WorkspaceFolder | undefined;
  persistGroups(groups: IGroup[]): Promise<void>;
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
  getPluginFilterPatterns(): string[];
  sendMessage(message: unknown): void;
  applyViewTransform(): void;
  smartRebuild(kind: 'rule' | 'plugin', id: string): void;
  resetAllSettings(): Promise<void>;
}

export interface GraphViewPrimaryMessageResult {
  handled: boolean;
  userGroups?: IGroup[];
  filterPatterns?: string[];
}

export function createGraphViewPrimaryGroupMessageState(
  context: GraphViewPrimaryMessageContext,
): GraphViewGroupMessageState {
  return {
    userGroups: context.getUserGroups(),
  };
}

export function createGraphViewPrimaryNodeFileHandlers(
  context: GraphViewPrimaryMessageContext,
): GraphViewNodeFileHandlers {
  return {
    ...context,
    timelineActive: context.getTimelineActive(),
    currentCommitSha: context.getCurrentCommitSha(),
  };
}

export function createGraphViewPrimarySettingsMessageState(
  context: GraphViewPrimaryMessageContext,
): GraphViewSettingsMessageState {
  return {
    activeViewId: context.getActiveViewId(),
    disabledPlugins: context.getDisabledPlugins(),
    disabledRules: context.getDisabledRules(),
    filterPatterns: context.getFilterPatterns(),
    graphData: context.getGraphData(),
    viewContext: context.getViewContext(),
  };
}

function createGraphViewPrimaryExportHandlers() {
  return {
    savePng: saveExportedPng,
    saveSvg: saveExportedSvg,
    saveJpeg: saveExportedJpeg,
    saveJson: saveExportedJson,
    saveMarkdown: saveExportedMarkdown,
  };
}

export async function dispatchGraphViewPrimaryMessage(
  message: WebviewToExtensionMessage,
  context: GraphViewPrimaryMessageContext,
): Promise<GraphViewPrimaryMessageResult> {
  if (await applyNodeFileMessage(message, createGraphViewPrimaryNodeFileHandlers(context))) {
    return { handled: true };
  }

  if (await applyExportMessage(message, createGraphViewPrimaryExportHandlers())) {
    return { handled: true };
  }

  if (await applyCommandMessage(message, context)) {
    return { handled: true };
  }

  if (await applyTimelineMessage(message, context)) {
    return { handled: true };
  }

  if (await applyPhysicsMessage(message, context)) {
    return { handled: true };
  }

  const groupState = createGraphViewPrimaryGroupMessageState(context);
  if (await applyGroupMessage(message, groupState, context)) {
    return {
      handled: true,
      userGroups: groupState.userGroups,
    };
  }

  const settingsState = createGraphViewPrimarySettingsMessageState(context);
  if (await applySettingsMessage(message, settingsState, context)) {
    return {
      handled: true,
      filterPatterns: settingsState.filterPatterns,
    };
  }

  return { handled: false };
}
