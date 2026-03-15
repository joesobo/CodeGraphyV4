import * as vscode from 'vscode';
import type {
  DagMode,
  IGraphData,
  IGroup,
  IPhysicsSettings,
  NodeSizeMode,
  WebviewToExtensionMessage,
} from '../../../shared/types';
import type { IViewContext } from '../../../core/views';
import { saveExportedJpeg } from '../../export/saveJpeg';
import { saveExportedJson } from '../../export/saveJson';
import { saveExportedMarkdown } from '../../export/saveMarkdown';
import { saveExportedPng } from '../../export/savePng';
import { saveExportedSvg } from '../../export/saveSvg';
import { applyCommandMessage } from './commands';
import { applyExportMessage } from './exports';
import { applyGroupMessage } from './groups';
import { applyNodeFileMessage } from './nodeFile';
import { applyPhysicsMessage } from './physics';
import { applySettingsMessage } from './settings';
import { applyTimelineMessage } from './timeline';

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

export async function dispatchGraphViewPrimaryMessage(
  message: WebviewToExtensionMessage,
  context: GraphViewPrimaryMessageContext,
): Promise<GraphViewPrimaryMessageResult> {
  if (
    await applyNodeFileMessage(message, {
      timelineActive: context.getTimelineActive(),
      currentCommitSha: context.getCurrentCommitSha(),
      openSelectedNode: nodeId => context.openSelectedNode(nodeId),
      activateNode: nodeId => context.activateNode(nodeId),
      previewFileAtCommit: (sha, filePath) => context.previewFileAtCommit(sha, filePath),
      openFile: filePath => context.openFile(filePath),
      revealInExplorer: filePath => context.revealInExplorer(filePath),
      copyToClipboard: text => context.copyToClipboard(text),
      deleteFiles: paths => context.deleteFiles(paths),
      renameFile: filePath => context.renameFile(filePath),
      createFile: directory => context.createFile(directory),
      toggleFavorites: paths => context.toggleFavorites(paths),
      addToExclude: patterns => context.addToExclude(patterns),
      analyzeAndSendData: () => context.analyzeAndSendData(),
      getFileInfo: filePath => context.getFileInfo(filePath),
    })
  ) {
    return { handled: true };
  }

  if (
    await applyExportMessage(message, {
      savePng: saveExportedPng,
      saveSvg: saveExportedSvg,
      saveJpeg: saveExportedJpeg,
      saveJson: saveExportedJson,
      saveMarkdown: saveExportedMarkdown,
    })
  ) {
    return { handled: true };
  }

  if (
    await applyCommandMessage(message, {
      undo: () => context.undo(),
      redo: () => context.redo(),
      showInformationMessage: detail => context.showInformationMessage(detail),
      changeView: viewId => context.changeView(viewId),
      setDepthLimit: depthLimit => context.setDepthLimit(depthLimit),
      updateDagMode: dagMode => context.updateDagMode(dagMode),
      updateNodeSizeMode: nodeSizeMode => context.updateNodeSizeMode(nodeSizeMode),
    })
  ) {
    return { handled: true };
  }

  if (
    await applyTimelineMessage(message, {
      indexRepository: () => context.indexRepository(),
      jumpToCommit: sha => context.jumpToCommit(sha),
      previewFileAtCommit: (sha, filePath) => context.previewFileAtCommit(sha, filePath),
    })
  ) {
    return { handled: true };
  }

  if (
    await applyPhysicsMessage(message, {
      sendPhysicsSettings: () => context.sendPhysicsSettings(),
      updatePhysicsSetting: (key, value) => context.updatePhysicsSetting(key, value),
      resetPhysicsSettings: () => context.resetPhysicsSettings(),
    })
  ) {
    return { handled: true };
  }

  const groupState = { userGroups: context.getUserGroups() };
  if (
    await applyGroupMessage(message, groupState, {
      workspaceFolder: context.workspaceFolder,
      persistGroups: groups => context.persistGroups(groups),
      recomputeGroups: () => context.recomputeGroups(),
      sendGroupsUpdated: () => context.sendGroupsUpdated(),
      showOpenDialog: options => context.showOpenDialog(options),
      createDirectory: uri => context.createDirectory(uri),
      copyFile: (source, destination, options) => context.copyFile(source, destination, options),
    })
  ) {
    return {
      handled: true,
      userGroups: groupState.userGroups,
    };
  }

  const settingsState = {
    activeViewId: context.getActiveViewId(),
    disabledPlugins: context.getDisabledPlugins(),
    disabledRules: context.getDisabledRules(),
    filterPatterns: context.getFilterPatterns(),
    graphData: context.getGraphData(),
    viewContext: context.getViewContext(),
  };
  if (
    await applySettingsMessage(message, settingsState, {
      getConfig: (key, defaultValue) => context.getConfig(key, defaultValue),
      updateConfig: (key, value) => context.updateConfig(key, value),
      getPluginFilterPatterns: () => context.getPluginFilterPatterns(),
      sendMessage: nextMessage => context.sendMessage(nextMessage),
      applyViewTransform: () => context.applyViewTransform(),
      smartRebuild: (kind, id) => context.smartRebuild(kind, id),
      resetAllSettings: () => context.resetAllSettings(),
    })
  ) {
    return {
      handled: true,
      filterPatterns: settingsState.filterPatterns,
    };
  }

  return { handled: false };
}
