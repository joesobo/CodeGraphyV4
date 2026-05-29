import {
  getWorkspaceSettingsPath,
  readCodeGraphyWorkspaceSettings,
  type CodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import * as fs from 'node:fs';

export interface WorkspacePipelineSettingsResult {
  settings: CodeGraphyWorkspaceSettings | undefined;
  workspaceRoot: string | undefined;
}

export function readWorkspacePipelineSettings(
  getWorkspaceRoot: () => string | undefined,
): WorkspacePipelineSettingsResult {
  const workspaceRoot = getWorkspaceRoot();
  const settings = workspaceRoot && fs.existsSync(getWorkspaceSettingsPath(workspaceRoot))
    ? readCodeGraphyWorkspaceSettings(workspaceRoot)
    : undefined;

  return { settings, workspaceRoot };
}
