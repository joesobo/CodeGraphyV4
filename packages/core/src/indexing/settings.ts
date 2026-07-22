import {
  ensureCodeGraphyWorkspaceSettings,
  type CodeGraphyWorkspaceSettings,
} from '../workspace/settings';
import type { IndexCodeGraphyWorkspaceOptions } from './contracts';

export function createEffectiveIndexSettings(
  workspaceRoot: string,
  options: IndexCodeGraphyWorkspaceOptions,
): CodeGraphyWorkspaceSettings {
  const workspaceSettings = options.settings ?? ensureCodeGraphyWorkspaceSettings(workspaceRoot);
  return {
    ...workspaceSettings,
    maxFiles: options.maxFiles ?? workspaceSettings.maxFiles,
    include: options.include ?? workspaceSettings.include,
    respectGitignore: options.respectGitignore ?? workspaceSettings.respectGitignore,
  };
}
