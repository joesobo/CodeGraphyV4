import * as fs from 'node:fs';
import { readCodeGraphyRepoMeta, writeCodeGraphyRepoMeta } from '../../../repoSettings/meta';
import { getWorkspaceAnalysisDatabasePath } from '../../database/cache/storage';

interface WorkspacePipelineSignatureDependencies {
  getPluginSignature(): string | null;
  getSettingsSignature(): string;
}

interface WorkspacePipelinePersistIndexDependencies
  extends WorkspacePipelineSignatureDependencies {
  getCurrentCommitSha(workspaceRoot: string): Promise<string | null>;
  warn(message: string, error: unknown): void;
}

export function hasWorkspacePipelineIndex(
  workspaceRoot: string | undefined,
): boolean {
  if (!workspaceRoot) {
    return false;
  }

  const meta = readCodeGraphyRepoMeta(workspaceRoot);
  if (meta.lastIndexedAt === null) {
    return false;
  }

  return fs.existsSync(getWorkspaceAnalysisDatabasePath(workspaceRoot));
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
      pendingChangedFiles: [],
    });
  } catch (error) {
    dependencies.warn('[CodeGraphy] Failed to update repo index metadata.', error);
  }
}
