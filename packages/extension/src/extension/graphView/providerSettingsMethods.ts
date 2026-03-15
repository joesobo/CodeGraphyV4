import * as vscode from 'vscode';
import type { IViewContext } from '../../core/views';
import type { ExtensionToWebviewMessage, IGroup, IPhysicsSettings, NodeSizeMode } from '../../shared/types';
import { readGraphViewPhysicsSettings } from '../graphViewPhysics';
import { getGraphViewConfigTarget } from '../graphViewSettings';
import { loadGraphViewDisabledState } from './disabledState';
import { applyLoadedGraphViewGroupState } from './groupSync';
import { loadGraphViewGroupState } from './groups';
import { resetGraphViewPhysicsSettings, updateGraphViewPhysicsSetting } from './physicsConfig';
import { captureGraphViewSettingsSnapshot } from './settings';
import { sendGraphViewProviderAllSettings, sendGraphViewProviderSettings } from './settingsLifecycle';

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

export interface GraphViewProviderSettingsMethodsSource {
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
  _getPhysicsSettings?(this: void): IPhysicsSettings;
}

export interface GraphViewProviderSettingsMethods {
  _loadGroupsAndFilterPatterns(): void;
  _loadDisabledRulesAndPlugins(): boolean;
  _sendSettings(): void;
  _getPhysicsSettings(): IPhysicsSettings;
  _sendPhysicsSettings(): void;
  _sendAllSettings(): void;
  _updatePhysicsSetting(key: keyof IPhysicsSettings, value: number): Promise<void>;
  _resetPhysicsSettings(): Promise<void>;
}

export interface GraphViewProviderSettingsMethodDependencies {
  getConfiguration(section: string): GraphViewProviderSettingsConfigLike;
  getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined;
  getConfigTarget(workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined): unknown;
  loadGroupState: typeof loadGraphViewGroupState;
  applyLoadedGroupState: typeof applyLoadedGraphViewGroupState;
  loadDisabledState: typeof loadGraphViewDisabledState;
  sendProviderSettings: typeof sendGraphViewProviderSettings;
  sendProviderAllSettings: typeof sendGraphViewProviderAllSettings;
  captureSettingsSnapshot: typeof captureGraphViewSettingsSnapshot;
  readPhysicsSettings: typeof readGraphViewPhysicsSettings;
  updatePhysicsSetting: typeof updateGraphViewPhysicsSetting;
  resetPhysicsSettings: typeof resetGraphViewPhysicsSettings;
  defaultPhysics: IPhysicsSettings;
}

const DEFAULT_DEPENDENCIES: GraphViewProviderSettingsMethodDependencies = {
  getConfiguration: section => vscode.workspace.getConfiguration(section),
  getWorkspaceFolders: () => vscode.workspace.workspaceFolders,
  getConfigTarget: workspaceFolders => getGraphViewConfigTarget(workspaceFolders),
  loadGroupState: loadGraphViewGroupState,
  applyLoadedGroupState: applyLoadedGraphViewGroupState,
  loadDisabledState: loadGraphViewDisabledState,
  sendProviderSettings: sendGraphViewProviderSettings,
  sendProviderAllSettings: sendGraphViewProviderAllSettings,
  captureSettingsSnapshot: captureGraphViewSettingsSnapshot,
  readPhysicsSettings: readGraphViewPhysicsSettings,
  updatePhysicsSetting: updateGraphViewPhysicsSetting,
  resetPhysicsSettings: resetGraphViewPhysicsSettings,
  defaultPhysics: {
    repelForce: 10,
    linkDistance: 80,
    linkForce: 0.15,
    damping: 0.7,
    centerForce: 0.1,
  },
};

export function createGraphViewProviderSettingsMethods(
  source: GraphViewProviderSettingsMethodsSource,
  dependencies: GraphViewProviderSettingsMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderSettingsMethods {
  const _loadGroupsAndFilterPatterns = (): void => {
    const config = dependencies.getConfiguration('codegraphy');
    const groupState = dependencies.loadGroupState(config as never, source._context.workspaceState as never);
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

  const _getPhysicsSettings = (): IPhysicsSettings =>
    dependencies.readPhysicsSettings(
      dependencies.getConfiguration('codegraphy.physics') as never,
      dependencies.defaultPhysics,
    );

  const readCurrentPhysicsSettings = (): IPhysicsSettings => {
    const implementation = source._getPhysicsSettings;
    if (implementation && implementation !== _getPhysicsSettings) {
      return implementation();
    }

    return _getPhysicsSettings();
  };

  const _sendPhysicsSettings = (): void => {
    source._sendMessage({
      type: 'PHYSICS_SETTINGS_UPDATED',
      payload: readCurrentPhysicsSettings(),
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
          dependencies.getConfiguration('codegraphy') as never,
          readCurrentPhysicsSettings(),
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

  const _updatePhysicsSetting = async (
    key: keyof IPhysicsSettings,
    value: number,
  ): Promise<void> => {
    await dependencies.updatePhysicsSetting(key, value, {
      getConfiguration: () => dependencies.getConfiguration('codegraphy.physics') as never,
      getConfigTarget: () => dependencies.getConfigTarget(dependencies.getWorkspaceFolders()),
    });
  };

  const _resetPhysicsSettings = async (): Promise<void> => {
    await dependencies.resetPhysicsSettings({
      getConfiguration: () => dependencies.getConfiguration('codegraphy.physics') as never,
      getConfigTarget: () => dependencies.getConfigTarget(dependencies.getWorkspaceFolders()),
    });
  };

  const methods: GraphViewProviderSettingsMethods = {
    _loadGroupsAndFilterPatterns,
    _loadDisabledRulesAndPlugins,
    _sendSettings,
    _getPhysicsSettings,
    _sendPhysicsSettings,
    _sendAllSettings,
    _updatePhysicsSetting,
    _resetPhysicsSettings,
  };

  Object.assign(source as object, methods);

  return methods;
}
