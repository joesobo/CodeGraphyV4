import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { CodeGraphyInstalledPluginRecord } from './installedCache';
import type { CodeGraphyWorkspaceSettings } from '../workspace/settings';

export interface LoadedCodeGraphyWorkspacePluginPackage {
  plugin: IPlugin;
  packageName: string;
  record: CodeGraphyInstalledPluginRecord;
  options?: Record<string, unknown>;
}

export interface LoadCodeGraphyWorkspacePluginPackagesOptions {
  disabledPlugins?: Iterable<string>;
  settings: CodeGraphyWorkspaceSettings;
  homeDir?: string;
  warn?: (message: string) => void;
  workspaceRoot?: string;
}

export interface PackageJsonWithEntrypoint {
  exports?: unknown;
  main?: unknown;
}
