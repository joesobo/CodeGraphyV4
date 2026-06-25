import * as fs from 'node:fs';
import { persistCodeGraphyWorkspaceIndexMetadata } from '@codegraphy-dev/core';
import { readCodeGraphyRepoMeta, writeCodeGraphyRepoMeta } from '../../../repoSettings/meta';
import { getWorkspaceAnalysisDatabasePath } from '../../database/cache/storage';

interface WorkspacePipelineSignatureDependencies {
  getPluginSignature(): string | null;
  getSettingsSignature(): string;
}

interface WorkspacePipelinePersistIndexDependencies
  extends WorkspacePipelineSignatureDependencies {
  getCurrentCommitSha?: () => Promise<string | null> | string | null;
  persistIndexMetadata?: typeof persistCodeGraphyWorkspaceIndexMetadata;
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
    const currentCommitSha = await dependencies.getCurrentCommitSha?.();
    (dependencies.persistIndexMetadata ?? persistCodeGraphyWorkspaceIndexMetadata)(workspaceRoot, {
      pluginSignature: dependencies.getPluginSignature(),
      settingsSignature: dependencies.getSettingsSignature(),
    });
    if (dependencies.getCurrentCommitSha) {
      writeCodeGraphyRepoMeta(workspaceRoot, {
        ...readCodeGraphyRepoMeta(workspaceRoot),
        lastIndexedCommit: currentCommitSha ?? null,
      });
    }
  } catch (error) {
    dependencies.warn('[CodeGraphy] Failed to update repo index metadata.', error);
  }
}
