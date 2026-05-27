import {
  disableCodeGraphyWorkspacePlugin,
  enableCodeGraphyWorkspacePlugin,
  linkCodeGraphyInstalledPluginPackage,
  type LinkCodeGraphyInstalledPluginPackageOptions,
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyUserStateOptions,
  registerCodeGraphyInstalledPlugin,
  type RegisterCodeGraphyInstalledPluginOptions,
} from '../../plugins/installedCache';
import { resolveNpmGlobalPackageRoots } from './globalPackages';

export interface PluginsCommandDependencies {
  cwd(): string;
  disableWorkspacePlugin(workspaceRoot: string, packageName: string): void;
  enableWorkspacePlugin(workspaceRoot: string, plugin: CodeGraphyInstalledPluginRecord): void;
  homeDir?: string;
  linkInstalledPluginPackage(
    options: LinkCodeGraphyInstalledPluginPackageOptions,
  ): Promise<CodeGraphyInstalledPluginRecord>;
  readInstalledPluginCache(options?: CodeGraphyUserStateOptions): CodeGraphyInstalledPluginCache;
  registerInstalledPlugin(options: RegisterCodeGraphyInstalledPluginOptions): Promise<CodeGraphyInstalledPluginRecord>;
  resolveGlobalPackageRoots(): string[];
}

export const DEFAULT_DEPENDENCIES: PluginsCommandDependencies = {
  cwd: () => process.cwd(),
  disableWorkspacePlugin: disableCodeGraphyWorkspacePlugin,
  enableWorkspacePlugin: enableCodeGraphyWorkspacePlugin,
  linkInstalledPluginPackage: linkCodeGraphyInstalledPluginPackage,
  readInstalledPluginCache: readCodeGraphyInstalledPluginCache,
  registerInstalledPlugin: registerCodeGraphyInstalledPlugin,
  resolveGlobalPackageRoots: resolveNpmGlobalPackageRoots,
};
