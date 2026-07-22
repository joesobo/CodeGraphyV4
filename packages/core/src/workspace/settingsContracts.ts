export interface CodeGraphyWorkspacePluginSettings {
  id: string;
  activation: 'inherit' | 'enabled' | 'disabled';
  package?: string;
  disabledFilterPatterns?: string[];
  options?: Record<string, unknown>;
}

export interface CodeGraphyWorkspaceSettings {
  version: 1;
  maxFiles: number;
  include: string[];
  respectGitignore: boolean;
  showOrphans: boolean;
  filterPatterns: string[];
  disabledCustomFilterPatterns: string[];
  nodeVisibility?: Record<string, boolean>;
  edgeVisibility?: Record<string, boolean>;
  plugins: CodeGraphyWorkspacePluginSettings[];
  pluginData?: Record<string, unknown>;
}
