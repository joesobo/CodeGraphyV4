import * as vscode from 'vscode';
import type { ExtensionToWebviewMessage, IPhysicsSettings } from '../../shared/types';
import { readGraphViewPhysicsSettings } from '../graphViewPhysics';
import { getGraphViewConfigTarget } from '../graphViewSettings';
import { resetGraphViewPhysicsSettings, updateGraphViewPhysicsSetting } from './physicsConfig';

interface GraphViewProviderSettingsConfigLike {
  get<T>(key: string, defaultValue: T): T;
}

export interface GraphViewProviderPhysicsSettingsMethodsSource {
  _sendMessage(message: ExtensionToWebviewMessage): void;
}

export interface GraphViewProviderPhysicsSettingsMethods {
  _getPhysicsSettings(): IPhysicsSettings;
  _sendPhysicsSettings(): void;
  _updatePhysicsSetting(key: keyof IPhysicsSettings, value: number): Promise<void>;
  _resetPhysicsSettings(): Promise<void>;
}

export interface GraphViewProviderPhysicsSettingsMethodDependencies {
  getConfiguration(section: string): GraphViewProviderSettingsConfigLike;
  getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined;
  getConfigTarget(workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined): unknown;
  readPhysicsSettings: typeof readGraphViewPhysicsSettings;
  updatePhysicsSetting: typeof updateGraphViewPhysicsSetting;
  resetPhysicsSettings: typeof resetGraphViewPhysicsSettings;
  defaultPhysics: IPhysicsSettings;
}

function createDefaultGraphViewProviderPhysicsSettingsMethodDependencies(): GraphViewProviderPhysicsSettingsMethodDependencies {
  return {
    getConfiguration: section => vscode.workspace.getConfiguration(section),
    getWorkspaceFolders: () => vscode.workspace.workspaceFolders,
    getConfigTarget: workspaceFolders => getGraphViewConfigTarget(workspaceFolders),
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
}

export function createGraphViewProviderPhysicsSettingsMethods(
  source: GraphViewProviderPhysicsSettingsMethodsSource,
  dependencies?: GraphViewProviderPhysicsSettingsMethodDependencies,
): GraphViewProviderPhysicsSettingsMethods {
  const resolvedDependencies =
    dependencies ?? createDefaultGraphViewProviderPhysicsSettingsMethodDependencies();
  const _getPhysicsSettings = (): IPhysicsSettings =>
    resolvedDependencies.readPhysicsSettings(
      resolvedDependencies.getConfiguration('codegraphy.physics') as never,
      resolvedDependencies.defaultPhysics,
    );

  const _sendPhysicsSettings = (): void => {
    source._sendMessage({
      type: 'PHYSICS_SETTINGS_UPDATED',
      payload: _getPhysicsSettings(),
    });
  };

  const _updatePhysicsSetting = async (
    key: keyof IPhysicsSettings,
    value: number,
  ): Promise<void> => {
    await resolvedDependencies.updatePhysicsSetting(key, value, {
      getConfiguration: () => resolvedDependencies.getConfiguration('codegraphy.physics') as never,
      getConfigTarget: () => resolvedDependencies.getConfigTarget(resolvedDependencies.getWorkspaceFolders()),
    });
  };

  const _resetPhysicsSettings = async (): Promise<void> => {
    await resolvedDependencies.resetPhysicsSettings({
      getConfiguration: () => resolvedDependencies.getConfiguration('codegraphy.physics') as never,
      getConfigTarget: () => resolvedDependencies.getConfigTarget(resolvedDependencies.getWorkspaceFolders()),
    });
  };

  return {
    _getPhysicsSettings,
    _sendPhysicsSettings,
    _updatePhysicsSetting,
    _resetPhysicsSettings,
  };
}
