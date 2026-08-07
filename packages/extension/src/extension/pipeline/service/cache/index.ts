import * as fs from 'node:fs';
import { persistCodeGraphyWorkspaceIndexMetadata } from '@codegraphy-dev/core';
import { readCodeGraphyRepoMeta } from '../../../repoSettings/meta';
import { getWorkspaceAnalysisDatabasePath } from '../../database/cache/storage';

interface WorkspacePipelineSignatureDependencies {
  getPluginBuildSignature(): string | null;
  getPluginSignature(): string | null;
  getSettingsSignature(): string;
}

interface WorkspacePipelinePersistIndexDependencies
  extends WorkspacePipelineSignatureDependencies {
  getFilterAccounting(): Parameters<typeof persistCodeGraphyWorkspaceIndexMetadata>[1]['filterAccounting'];
  getCurrentCommitSha?: () => Promise<string | null> | string | null;
  persistIndexMetadata?: (
    workspaceRoot: string,
    metadata: Parameters<typeof persistCodeGraphyWorkspaceIndexMetadata>[1],
  ) => Promise<void> | void;
  warn(message: string, error: unknown): void;
}

export function hasWorkspacePipelineIndex(
  workspaceRoot: string | undefined,
  hasRecoverableGraphState = false,
): boolean {
  if (!workspaceRoot) {
    return false;
  }

  const meta = readCodeGraphyRepoMeta(workspaceRoot);
  if (meta.lastIndexedAt === null) {
    return false;
  }

  return hasRecoverableGraphState
    || fs.existsSync(getWorkspaceAnalysisDatabasePath(workspaceRoot));
}

export async function persistWorkspacePipelineIndexMetadata(
  workspaceRoot: string | undefined,
  dependencies: WorkspacePipelinePersistIndexDependencies,
  resolvedChangedFilePaths?: readonly string[],
): Promise<void> {
  if (!workspaceRoot) {
    return;
  }

  try {
    const currentCommitSha = await dependencies.getCurrentCommitSha?.();
    await (dependencies.persistIndexMetadata ?? persistCodeGraphyWorkspaceIndexMetadata)(workspaceRoot, {
      filterAccounting: dependencies.getFilterAccounting(),
      ...(dependencies.getCurrentCommitSha
        ? { lastIndexedCommit: currentCommitSha ?? null }
        : {}),
      pluginBuildSignature: dependencies.getPluginBuildSignature(),
      pluginSignature: dependencies.getPluginSignature(),
      settingsSignature: dependencies.getSettingsSignature(),
      ...(resolvedChangedFilePaths === undefined
        ? {}
        : { resolvedChangedFilePaths }),
    });
  } catch (error) {
    dependencies.warn('[CodeGraphy] Failed to update repo index metadata.', error);
    throw error;
  }
}
