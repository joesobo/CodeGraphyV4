import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import { DEFAULT_PHYSICS_SETTINGS, type IPhysicsSettings } from '../../../shared/settings/physics';
import { readGraphViewPhysicsSettings } from '../settings/physics/reader';
import { resetGraphViewPhysicsSettings, updateGraphViewPhysicsSetting } from '../settings/physics/updates';
import { getCodeGraphyConfiguration } from '../../repoSettings/current';
import { getGraphViewConfigTarget } from '../settings/reader';
import * as vscode from 'vscode';

interface GraphViewProviderSettingsConfigLike {
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown, target: unknown): PromiseLike<void>;
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
  getConfiguration(): GraphViewProviderSettingsConfigLike;
  getConfigTarget?(workspaceFolders: readonly unknown[] | undefined): unknown;
  getWorkspaceFolders?(): readonly unknown[] | undefined;
  readPhysicsSettings(
    config: Pick<GraphViewProviderSettingsConfigLike, 'get'>,
    defaults: IPhysicsSettings,
  ): IPhysicsSettings;
  updatePhysicsSetting: typeof updateGraphViewPhysicsSetting;
  resetPhysicsSettings: typeof resetGraphViewPhysicsSettings;
  defaultPhysics: IPhysicsSettings;
}

function createDefaultGraphViewProviderPhysicsSettingsMethodDependencies(): GraphViewProviderPhysicsSettingsMethodDependencies {
  return {
    getConfiguration: () => getCodeGraphyConfiguration(),
    getConfigTarget: workspaceFolders => getGraphViewConfigTarget(workspaceFolders),
    getWorkspaceFolders: () => vscode.workspace.workspaceFolders,
    readPhysicsSettings: readGraphViewPhysicsSettings,
    updatePhysicsSetting: updateGraphViewPhysicsSetting,
    resetPhysicsSettings: resetGraphViewPhysicsSettings,
    defaultPhysics: DEFAULT_PHYSICS_SETTINGS,
  };
}

export function createGraphViewProviderPhysicsSettingsMethods(
  source: GraphViewProviderPhysicsSettingsMethodsSource,
  dependencies?: GraphViewProviderPhysicsSettingsMethodDependencies,
): GraphViewProviderPhysicsSettingsMethods {
  const resolvedDependencies =
    dependencies ?? createDefaultGraphViewProviderPhysicsSettingsMethodDependencies();
  const resolveConfigTarget = (): unknown => {
    const workspaceFolders = resolvedDependencies.getWorkspaceFolders?.();
    return resolvedDependencies.getConfigTarget?.(workspaceFolders)
      ?? getGraphViewConfigTarget(workspaceFolders);
  };
  const _getPhysicsSettings = (): IPhysicsSettings =>
    resolvedDependencies.readPhysicsSettings(
      resolvedDependencies.getConfiguration(),
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
      getConfiguration: () => resolvedDependencies.getConfiguration(),
      getConfigTarget: () => resolveConfigTarget(),
    });
  };

  const _resetPhysicsSettings = async (): Promise<void> => {
    await resolvedDependencies.resetPhysicsSettings({
      getConfiguration: () => resolvedDependencies.getConfiguration(),
      getConfigTarget: () => resolveConfigTarget(),
    });
  };

  return {
    _getPhysicsSettings,
    _sendPhysicsSettings,
    _updatePhysicsSetting,
    _resetPhysicsSettings,
  };
}
