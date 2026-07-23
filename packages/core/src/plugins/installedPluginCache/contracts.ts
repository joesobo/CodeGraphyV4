import type { CodeGraphyPluginPackageDescriptor } from '../packageManifest';

export interface CodeGraphyInstalledPluginRecord extends CodeGraphyPluginPackageDescriptor {
  package: string;
  version: string;
  packageRoot: string;
  globallyEnabled: boolean;
}

export interface CodeGraphyInstalledPluginCache {
  version: 3;
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
