import { readCodeGraphyRepoMeta, writeCodeGraphyRepoMeta } from '../../../repoSettings/meta';

interface WorkspacePipelineSignatureDependencies {
  getPluginSignature(): string | null;
  getSettingsSignature(): string;
}

interface WorkspacePipelineHasIndexDependencies
  extends WorkspacePipelineSignatureDependencies {
  getCurrentCommitShaSync(workspaceRoot: string): string | null;
}

interface WorkspacePipelinePersistIndexDependencies
  extends WorkspacePipelineSignatureDependencies {
  getCurrentCommitSha(workspaceRoot: string): Promise<string | null>;
  warn(message: string, error: unknown): void;
}

export function hasWorkspacePipelineIndex(
  workspaceRoot: string | undefined,
  dependencies: WorkspacePipelineHasIndexDependencies,
): boolean {
  if (!workspaceRoot) {
    return false;
  }

  const meta = readCodeGraphyRepoMeta(workspaceRoot);
  if (meta.lastIndexedAt === null) {
    return false;
  }

  const signaturesMatch =
    meta.pluginSignature === dependencies.getPluginSignature()
    && meta.settingsSignature === dependencies.getSettingsSignature();
  if (!signaturesMatch) {
    return false;
  }

  const currentCommit = dependencies.getCurrentCommitShaSync(workspaceRoot);
  if (currentCommit === null) {
    return meta.lastIndexedCommit === null;
  }

  return meta.lastIndexedCommit === currentCommit;
}

export async function persistWorkspacePipelineIndexMetadata(
  workspaceRoot: string | undefined,
  dependencies: WorkspacePipelinePersistIndexDependencies,
): Promise<void> {
  if (!workspaceRoot) {
    return;
  }

  try {
    const meta = readCodeGraphyRepoMeta(workspaceRoot);
    writeCodeGraphyRepoMeta(workspaceRoot, {
      ...meta,
      lastIndexedAt: new Date().toISOString(),
      lastIndexedCommit: await dependencies.getCurrentCommitSha(workspaceRoot),
      pluginSignature: dependencies.getPluginSignature(),
      settingsSignature: dependencies.getSettingsSignature(),
    });
  } catch (error) {
    dependencies.warn('[CodeGraphy] Failed to update repo index metadata.', error);
  }
}
