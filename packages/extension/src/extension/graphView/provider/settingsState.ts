import * as vscode from 'vscode';
import type { IGraphData } from '../../../shared/graph/types';
import type { NodeSizeMode } from '../../../shared/settings/modes';
import type { IViewContext } from '../../../core/views/contracts';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type { IGroup } from '../../../shared/settings/groups';
import type { IPhysicsSettings } from '../../../shared/settings/physics';
import { getCodeGraphyConfiguration } from '../../repoSettings/current';
import { getGraphViewConfigTarget } from '../settings/reader';
import { loadGraphViewDisabledState } from '../settings/disabled';
import { applyLoadedGraphViewGroupState } from '../groups/sync';
import { loadGraphViewGroupState } from '../groups/state';
import { captureGraphViewSettingsSnapshot } from '../settings/snapshot';
import { sendGraphViewProviderAllSettings, sendGraphViewProviderSettings } from '../settings/lifecycle';
import { sendGraphControlsUpdated } from '../controls/send';

interface GraphViewProviderSettingsAnalyzerLike {
  getPluginFilterPatterns(): string[];
  registry?: unknown;
}

interface GraphViewProviderSettingsWorkspaceStateLike {
  get<T>(key: string): T | undefined;
}

interface GraphViewProviderSettingsConfigLike {
  get<T>(key: string, defaultValue: T): T;
  inspect<T>(key: string): {
    defaultValue?: T;
    globalValue?: T;
    workspaceValue?: T;
    workspaceFolderValue?: T;
  } | undefined;
  update(key: string, value: unknown, target: unknown): PromiseLike<void>;
}

export interface GraphViewProviderSettingsStateMethodsSource {
  _context: { workspaceState: GraphViewProviderSettingsWorkspaceStateLike };
  _viewContext: IViewContext;
  _userGroups: IGroup[];
  _filterPatterns: string[];
  _graphData: IGraphData;
  _disabledSources: Set<string>;
  _disabledPlugins: Set<string>;
  _nodeSizeMode: NodeSizeMode;
  _analyzer?: GraphViewProviderSettingsAnalyzerLike;
  _computeMergedGroups(): void;
  _sendGroupsUpdated(): void;
  _sendMessage(message: ExtensionToWebviewMessage): void;
  _getPhysicsSettings(): IPhysicsSettings;
}

export interface GraphViewProviderSettingsStateMethods {
  _loadGroupsAndFilterPatterns(): void;
  _loadDisabledRulesAndPlugins(): boolean;
  _sendSettings(): void;
  _sendAllSettings(): void;
}

export interface GraphViewProviderSettingsStateMethodDependencies {
  getConfiguration(section: string): GraphViewProviderSettingsConfigLike;
  getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined;
  getConfigTarget(workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined): unknown;
  loadGroupState(
    config: GraphViewProviderSettingsConfigLike,
  ): ReturnType<typeof loadGraphViewGroupState>;
  applyLoadedGroupState: typeof applyLoadedGraphViewGroupState;
  loadDisabledState: typeof loadGraphViewDisabledState;
  sendProviderSettings: typeof sendGraphViewProviderSettings;
  sendProviderAllSettings: typeof sendGraphViewProviderAllSettings;
  captureSettingsSnapshot(
    configuration: GraphViewProviderSettingsConfigLike,
    physicsSettings: IPhysicsSettings,
    nodeSizeMode: NodeSizeMode,
  ): ReturnType<typeof captureGraphViewSettingsSnapshot>;
}

export function createDefaultGraphViewProviderSettingsStateMethodDependencies(): GraphViewProviderSettingsStateMethodDependencies {
  return {
    getConfiguration: section =>
      section === 'codegraphy'
        ? getCodeGraphyConfiguration()
        : vscode.workspace.getConfiguration(section),
    getWorkspaceFolders: () => vscode.workspace.workspaceFolders,
    getConfigTarget: workspaceFolders => getGraphViewConfigTarget(workspaceFolders),
    loadGroupState: loadGraphViewGroupState,
    applyLoadedGroupState: applyLoadedGraphViewGroupState,
    loadDisabledState: loadGraphViewDisabledState,
    sendProviderSettings: sendGraphViewProviderSettings,
    sendProviderAllSettings: sendGraphViewProviderAllSettings,
    captureSettingsSnapshot: captureGraphViewSettingsSnapshot,
  };
}

export function createGraphViewProviderSettingsStateMethods(
  source: GraphViewProviderSettingsStateMethodsSource,
  dependencies: GraphViewProviderSettingsStateMethodDependencies =
    createDefaultGraphViewProviderSettingsStateMethodDependencies(),
): GraphViewProviderSettingsStateMethods {
  const syncGroupStateToSource = (state: {
    userGroups: IGroup[] | undefined;
    filterPatterns: string[] | undefined;
  }): void => {
    source._userGroups = Array.isArray(state.userGroups) ? state.userGroups : [];
    source._filterPatterns = Array.isArray(state.filterPatterns) ? state.filterPatterns : [];
  };

  const _loadGroupsAndFilterPatterns = (): void => {
    const config = dependencies.getConfiguration('codegraphy');
    const groupState = dependencies.loadGroupState(config);
    const state = {
      userGroups: source._userGroups,
      filterPatterns: source._filterPatterns,
    };

    dependencies.applyLoadedGroupState(groupState, state, {
      recomputeGroups: () => {
        syncGroupStateToSource(state);
        source._computeMergedGroups();
      },
    });

    syncGroupStateToSource(state);
  };

  const _loadDisabledRulesAndPlugins = (): boolean => {
    const config = dependencies.getConfiguration('codegraphy');
    const disabledState = dependencies.loadDisabledState(
      source._disabledPlugins,
      {
        disabledPluginsInspect: config.inspect<string[]>('disabledPlugins'),
      },
    );

    source._disabledSources = new Set<string>();
    source._disabledPlugins = disabledState.disabledPlugins;
    return disabledState.changed;
  };

  const _sendSettings = (): void => {
    dependencies.sendProviderSettings(source._viewContext, {
      getConfiguration: () => dependencies.getConfiguration('codegraphy'),
      sendMessage: message => source._sendMessage(message),
    });
    sendGraphControlsUpdated(
      source._graphData,
      source._analyzer,
      message => source._sendMessage(message),
      dependencies.getConfiguration('codegraphy'),
    );
  };

  const _sendAllSettings = (): void => {
    const state = {
      viewContext: source._viewContext,
      userGroups: source._userGroups,
      filterPatterns: source._filterPatterns,
    };

    dependencies.sendProviderAllSettings(state, {
      captureSettingsSnapshot: () =>
        dependencies.captureSettingsSnapshot(
          dependencies.getConfiguration('codegraphy'),
          source._getPhysicsSettings(),
          source._nodeSizeMode,
        ),
      getPluginFilterPatterns: () =>
        typeof source._analyzer?.getPluginFilterPatterns === 'function'
          ? source._analyzer.getPluginFilterPatterns()
          : [],
      sendMessage: message => source._sendMessage(message),
      recomputeGroups: () => {
        syncGroupStateToSource(state);
        source._computeMergedGroups();
      },
      sendGroupsUpdated: () => source._sendGroupsUpdated(),
    });

    sendGraphControlsUpdated(
      source._graphData,
      source._analyzer,
      message => source._sendMessage(message),
      dependencies.getConfiguration('codegraphy'),
    );

    syncGroupStateToSource(state);
  };

  return {
    _loadGroupsAndFilterPatterns,
    _loadDisabledRulesAndPlugins,
    _sendSettings,
    _sendAllSettings,
  };
}
