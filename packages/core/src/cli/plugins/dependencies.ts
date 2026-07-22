import {
  disableCodeGraphyWorkspacePlugin,
  enableCodeGraphyWorkspacePlugin,
  inheritCodeGraphyWorkspacePlugin,
  linkCodeGraphyInstalledPluginPackage,
  type LinkCodeGraphyInstalledPluginPackageOptions,
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyUserStateOptions,
  registerCodeGraphyInstalledPlugin,
  setCodeGraphyInstalledPluginGlobalActivation,
  type RegisterCodeGraphyInstalledPluginOptions,
} from '../../plugins/installedCache';
import { resolveNpmGlobalPackageRoots } from './globalPackages';

export interface PluginsCommandDependencies {
  cwd(): string;
  disableWorkspacePlugin(workspaceRoot: string, pluginId: string): void;
  enableWorkspacePlugin(workspaceRoot: string, plugin: CodeGraphyInstalledPluginRecord): void;
  homeDir?: string;
  inheritWorkspacePlugin(workspaceRoot: string, pluginId: string): void;
  linkInstalledPluginPackage(
    options: LinkCodeGraphyInstalledPluginPackageOptions,
  ): Promise<CodeGraphyInstalledPluginRecord[]>;
  readInstalledPluginCache(options?: CodeGraphyUserStateOptions): CodeGraphyInstalledPluginCache;
  registerInstalledPlugin(options: RegisterCodeGraphyInstalledPluginOptions): Promise<CodeGraphyInstalledPluginRecord[]>;
  resolveGlobalPackageRoots(): string[];
  setGlobalPluginActivation(
    pluginId: string,
    globallyEnabled: boolean,
    options?: CodeGraphyUserStateOptions,
  ): CodeGraphyInstalledPluginRecord;
}

export const DEFAULT_DEPENDENCIES: PluginsCommandDependencies = {
  cwd: () => process.cwd(),
  disableWorkspacePlugin: disableCodeGraphyWorkspacePlugin,
  enableWorkspacePlugin: enableCodeGraphyWorkspacePlugin,
  inheritWorkspacePlugin: inheritCodeGraphyWorkspacePlugin,
  linkInstalledPluginPackage: linkCodeGraphyInstalledPluginPackage,
  readInstalledPluginCache: readCodeGraphyInstalledPluginCache,
  registerInstalledPlugin: registerCodeGraphyInstalledPlugin,
  resolveGlobalPackageRoots: resolveNpmGlobalPackageRoots,
  setGlobalPluginActivation: setCodeGraphyInstalledPluginGlobalActivation,
};
