import type { CodeGraphyInstalledPluginRecord } from '../installedPluginCache/contracts';

export interface WorkspaceIndexPluginStatus {
  id: string;
  packageName?: string;
  name: string;
  version: string;
  supportedExtensions: string[];
  status: 'active' | 'installed' | 'inactive' | 'unavailable';
  enabled: boolean;
  connectionCount: number;
}

export interface WorkspaceIndexPluginStatusOptions {
  disabledPlugins: ReadonlySet<string>;
  discoveredFiles: Array<{ relativePath: string }>;
  fileConnections: ReadonlyMap<string, Array<{ pluginId?: string; resolvedPath?: string | null }>>;
  installedPlugins?: readonly CodeGraphyInstalledPluginRecord[];
  pluginInfos: Array<{
    builtIn: boolean;
    plugin: {
      id: string;
      name: string;
      version: string;
      supportedExtensions: string[];
    };
    sourcePackage?: string;
  }>;
  workspaceEnabledPackageNames?: ReadonlySet<string>;
}
