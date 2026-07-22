import {
  createCodeGraphyWorkspaceSettingsSignature,
  normalizeCodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import type { Configuration } from '../../config/reader';

export function createWorkspacePipelineSettingsSignature(
  config: Configuration,
  corePlugins: readonly { plugin: { id: string } }[],
): string {
  return createCodeGraphyWorkspaceSettingsSignature(
    normalizeCodeGraphyWorkspaceSettings(config.getAll()),
    new Set(corePlugins.map(info => info.plugin.id)),
  );
}
