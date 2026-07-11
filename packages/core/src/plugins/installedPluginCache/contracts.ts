import type { CodeGraphyPluginPackageManifest } from '../packageManifest';

export interface CodeGraphyInstalledPluginRecord extends CodeGraphyPluginPackageManifest {
  packageRoot: string;
  pluginId?: string;
  pluginName?: string;
  supportedExtensions?: string[];
  minCoreVersion?: string;
}

export interface CodeGraphyInstalledPluginCache {
  version: 1;
  plugins: CodeGraphyInstalledPluginRecord[];
}

export interface CodeGraphyUserStateOptions {
  homeDir?: string;
}

export interface RegisterCodeGraphyInstalledPluginOptions extends CodeGraphyUserStateOptions {
  packageName: string;
  globalPackageRoots: string[];
}

export interface LinkCodeGraphyInstalledPluginPackageOptions extends CodeGraphyUserStateOptions {
  packageRoot: string;
}
