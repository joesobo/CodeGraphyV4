import { DEFAULT_INCLUDE, DEFAULT_MAX_FILES } from '../discovery/file/defaults';
import type { CodeGraphyWorkspaceSettings } from './settingsContracts';

export const CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME = '@codegraphy-dev/plugin-markdown';
export const CODEGRAPHY_MARKDOWN_PLUGIN_ID = 'codegraphy.markdown';

export function createDefaultCodeGraphyWorkspaceSettings(): CodeGraphyWorkspaceSettings {
  return {
    version: 1,
    maxFiles: DEFAULT_MAX_FILES,
    include: DEFAULT_INCLUDE,
    respectGitignore: true,
    filterPatterns: [],
    disabledCustomFilterPatterns: [],
    nodeVisibility: {},
    edgeVisibility: {},
    plugins: [],
    interfaces: [],
    pluginData: {},
  };
}

export function createInitialCodeGraphyWorkspaceSettings(): CodeGraphyWorkspaceSettings {
  return {
    ...createDefaultCodeGraphyWorkspaceSettings(),
    plugins: [{
      id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
      activation: 'enabled',
    }],
  };
}
