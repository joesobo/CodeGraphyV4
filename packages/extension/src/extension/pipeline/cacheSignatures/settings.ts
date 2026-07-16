import {
  createCodeGraphyWorkspaceSettingsSignature,
  normalizeCodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import type { Configuration } from '../../config/reader';

export function createWorkspacePipelineSettingsSignature(
  config: Configuration,
): string {
  return createCodeGraphyWorkspaceSettingsSignature(
    normalizeCodeGraphyWorkspaceSettings(config.getAll()),
  );
}
