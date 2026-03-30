import * as vscode from 'vscode';
import type { NodeSizeMode } from '../../../shared/settings/modes';
import type { IViewContext } from '../../../core/views/contracts';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type { IGroup } from '../../../shared/settings/groups';
import type { IPhysicsSettings } from '../../../shared/settings/physics';
import { getGraphViewConfigTarget } from '../settings/reader';
import { loadGraphViewDisabledState } from '../settings/disabled';
import { applyLoadedGraphViewGroupState } from '../groups/sync';
import { loadGraphViewGroupState } from '../groups/state';
import { captureGraphViewSettingsSnapshot } from '../settings/snapshotMessages';
import { sendGraphViewProviderAllSettings, sendGraphViewProviderSettings } from '../settings/lifecycle';

interface GraphViewProviderSettingsAnalyzerLike {
  getPluginFilterPatterns(): string[];
}

interface GraphViewProviderSettingsWorkspaceStateLike {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): PromiseLike<void>;
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
  _hiddenPluginGroupIds: Set<string>;
  _userGroups: IGroup[];
  _filterPatterns: string[];
  _disabledRules: Set<string>;
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
    workspaceState: GraphViewProviderSettingsWorkspaceStateLike,
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
    getConfiguration: section => vscode.workspace.getConfiguration(section),
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
  const _loadGroupsAndFilterPatterns = (): void => {
    const config = dependencies.getConfiguration('codegraphy');
    const groupState = dependencies.loadGroupState(config, source._context.workspaceState);
    const state = {
      userGroups: source._userGroups,
      hiddenPluginGroupIds: source._hiddenPluginGroupIds,
      filterPatterns: source._filterPatterns,
    };

    dependencies.applyLoadedGroupState(groupState, state, {
      recomputeGroups: () => source._computeMergedGroups(),
      persistLegacyGroups: groups => {
        const target = dependencies.getConfigTarget(dependencies.getWorkspaceFolders());
        void dependencies.getConfiguration('codegraphy').update('groups', groups, target);
      },
      clearLegacyGroups: () => {
        void source._context.workspaceState.update('codegraphy.groups', undefined);
      },
    });

    source._userGroups = state.userGroups;
    source._hiddenPluginGroupIds = state.hiddenPluginGroupIds;
    source._filterPatterns = state.filterPatterns;
  };

  const _loadDisabledRulesAndPlugins = (): boolean => {
    const config = dependencies.getConfiguration('codegraphy');
    const disabledState = dependencies.loadDisabledState(
      source._disabledRules,
      source._disabledPlugins,
      {
        disabledRulesInspect: config.inspect<string[]>('disabledRules'),
        disabledPluginsInspect: config.inspect<string[]>('disabledPlugins'),
        persistedDisabledRules: source._context.workspaceState.get<string[]>('codegraphy.disabledRules'),
        persistedDisabledPlugins: source._context.workspaceState.get<string[]>('codegraphy.disabledPlugins'),
      },
    );

    source._disabledRules = disabledState.disabledRules;
    source._disabledPlugins = disabledState.disabledPlugins;
    return disabledState.changed;
  };

  const _sendSettings = (): void => {
    dependencies.sendProviderSettings(source._viewContext, {
      getConfiguration: () => dependencies.getConfiguration('codegraphy'),
      sendMessage: message => source._sendMessage(message),
    });
  };

  const _sendAllSettings = (): void => {
    const state = {
      viewContext: source._viewContext,
      hiddenPluginGroupIds: source._hiddenPluginGroupIds,
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
      getPluginFilterPatterns: () => source._analyzer?.getPluginFilterPatterns() ?? [],
      sendMessage: message => source._sendMessage(message),
      recomputeGroups: () => source._computeMergedGroups(),
      sendGroupsUpdated: () => source._sendGroupsUpdated(),
    });

    source._hiddenPluginGroupIds = state.hiddenPluginGroupIds;
    source._userGroups = state.userGroups;
    source._filterPatterns = state.filterPatterns;
  };

  return {
    _loadGroupsAndFilterPatterns,
    _loadDisabledRulesAndPlugins,
    _sendSettings,
    _sendAllSettings,
  };
}
