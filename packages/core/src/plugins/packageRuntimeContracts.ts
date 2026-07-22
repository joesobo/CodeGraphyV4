import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { CodeGraphyInstalledPluginRecord } from './installedCache';
import type { CodeGraphyWorkspaceSettings } from '../workspace/settings';

export interface LoadedCodeGraphyWorkspacePluginPackage {
  buildIdentity: string;
  bundled?: boolean;
  plugin: IPlugin;
  packageName: string;
  record: CodeGraphyInstalledPluginRecord;
  options?: Record<string, unknown>;
}

export interface PreparedCodeGraphyWorkspacePluginPackage {
  buildIdentity: string;
  bundled?: boolean;
  packageName: string;
  record: CodeGraphyInstalledPluginRecord;
  options?: Record<string, unknown>;
  load(): Promise<LoadedCodeGraphyWorkspacePluginPackage>;
}

export interface LoadedCodeGraphyPluginPackageModule {
  buildIdentity: string;
  moduleNamespace: unknown;
}

export interface LoadCodeGraphyWorkspacePluginPackagesOptions {
  bundledPackageRoots?: Iterable<string>;
  disabledPlugins?: Iterable<string>;
  settings: CodeGraphyWorkspaceSettings;
  homeDir?: string;
  warn?: (message: string) => void;
  workspaceRoot?: string;
}

export interface ResolvedCodeGraphyWorkspacePluginRecords {
  bundledPackageRoots: ReadonlySet<string>;
  records: readonly CodeGraphyInstalledPluginRecord[];
}

export interface PackageJsonWithEntrypoint {
  exports?: unknown;
  main?: unknown;
}
