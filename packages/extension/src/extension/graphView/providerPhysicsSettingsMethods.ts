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

const DEFAULT_DEPENDENCIES: GraphViewProviderPhysicsSettingsMethodDependencies = {
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

export function createGraphViewProviderPhysicsSettingsMethods(
  source: GraphViewProviderPhysicsSettingsMethodsSource,
  dependencies: GraphViewProviderPhysicsSettingsMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderPhysicsSettingsMethods {
  const _getPhysicsSettings = (): IPhysicsSettings =>
    dependencies.readPhysicsSettings(
      dependencies.getConfiguration('codegraphy.physics') as never,
      dependencies.defaultPhysics,
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

  return {
    _getPhysicsSettings,
    _sendPhysicsSettings,
    _updatePhysicsSetting,
    _resetPhysicsSettings,
  };
}
