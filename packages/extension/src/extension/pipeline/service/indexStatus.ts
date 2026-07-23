import { readCodeGraphyWorkspaceStatus } from '@codegraphy-dev/core';

export interface WorkspacePipelineIndexStatusInput {
  hasIndex(): boolean;
  pluginBuildSignature: string | null;
  pluginSignature: string | null;
  settingsSignature: string;
  workspaceRoot: string | undefined;
}

export function getWorkspacePipelineIndexStatus(
  input: WorkspacePipelineIndexStatusInput,
): { freshness: 'fresh' | 'stale' | 'missing'; detail: string } {
  if (!input.workspaceRoot) {
    return {
      freshness: 'missing',
      detail: 'CodeGraphy index is missing. Index the workspace to build the graph.',
    };
  }

  if (!input.hasIndex()) {
    return {
      freshness: 'missing',
      detail: 'CodeGraphy index is missing. Index the workspace to build the graph.',
    };
  }

  const status = readCodeGraphyWorkspaceStatus(input.workspaceRoot, {
    pluginBuildSignature: input.pluginBuildSignature,
    pluginSignature: input.pluginSignature,
    settingsSignature: input.settingsSignature,
  });

  return {
    freshness: status.state,
    detail: status.detail,
  };
}
