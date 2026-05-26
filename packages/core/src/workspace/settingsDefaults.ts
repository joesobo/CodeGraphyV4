import { DEFAULT_INCLUDE, DEFAULT_MAX_FILES } from '../discovery/file/defaults';
import type { CodeGraphyWorkspaceSettings } from './settingsContracts';

export const CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME = '@codegraphy-dev/plugin-markdown';

export function createDefaultCodeGraphyWorkspaceSettings(): CodeGraphyWorkspaceSettings {
  return {
    version: 1,
    maxFiles: DEFAULT_MAX_FILES,
    include: DEFAULT_INCLUDE,
    respectGitignore: true,
    showOrphans: true,
    filterPatterns: [],
    disabledCustomFilterPatterns: [],
    plugins: [],
  };
}

export function createInitialCodeGraphyWorkspaceSettings(): CodeGraphyWorkspaceSettings {
  return {
    ...createDefaultCodeGraphyWorkspaceSettings(),
    plugins: [{
      package: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
    }],
  };
}
