import type { CodeGraphyPluginPackageManifest } from '../packageManifest';

export interface CodeGraphyInstalledPluginRecord extends CodeGraphyPluginPackageManifest {
  packageRoot: string;
  globallyEnabled?: boolean;
  pluginId?: string;
  pluginName?: string;
  supportedExtensions?: string[];
}

export interface CodeGraphyInstalledPluginCache {
  version: 2;
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
