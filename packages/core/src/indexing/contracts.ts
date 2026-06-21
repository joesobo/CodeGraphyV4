import type { IGraphData, IPlugin } from '@codegraphy-dev/plugin-api';
import type { IWorkspaceAnalysisCache } from '../analysis/cache';
import type { IDiscoveredFile } from '../discovery/contracts';
import type { CodeGraphyWorkspaceSettings } from '../workspace/settings';

export interface IndexCodeGraphyWorkspacePluginEntry {
  plugin: IPlugin;
  builtIn?: boolean;
  sourcePackage?: string;
  options?: Record<string, unknown>;
}

export type IndexCodeGraphyWorkspacePlugin =
  | IPlugin
  | IndexCodeGraphyWorkspacePluginEntry;

export interface IndexCodeGraphyWorkspaceOptions {
  workspaceRoot: string;
  plugins?: IndexCodeGraphyWorkspacePlugin[];
  settings?: CodeGraphyWorkspaceSettings;
  includeCorePlugins?: boolean;
  include?: string[];
  filterPatterns?: string[];
  disabledPlugins?: Iterable<string>;
  maxFiles?: number;
  respectGitignore?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: { phase: string; current: number; total: number }) => void;
  logInfo?: (message: string) => void;
  warn?: (message: string) => void;
  userHomeDir?: string;
}

export interface IndexCodeGraphyWorkspaceResult {
  workspaceRoot: string;
  graphCachePath: string;
  graph: IGraphData;
  cache: IWorkspaceAnalysisCache;
  files: IDiscoveredFile[];
  directories: string[];
  gitIgnoredPaths?: string[];
  limitReached: boolean;
  totalFound: number;
}
