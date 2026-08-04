import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { WORKSPACE_ANALYSIS_CACHE_VERSION } from '../analysis/cache';
import { looseStringArraySchema } from '../values';
import { getWorkspaceMetaPath } from './paths';
import { getWorkspaceAnalysisDatabasePath } from '../graphCache/database/storage';
import {
  hasWorkspaceCacheWriteOwnership,
  withWorkspaceCacheWriteLockIfParentExistsAsync,
} from '../graphCache/database/writeCoordination/model';

export interface CodeGraphyWorkspaceMeta {
  version: 1;
  lastIndexedAt: string | null;
  lastIndexedCommit?: string | null;
  pluginSignature: string | null;
  pluginBuildSignature: string | null;
  settingsSignature: string | null;
  analysisVersion: string | null;
  pendingChangedFiles: string[];
  failedPluginIds: string[];
}

const optionalNullableStringSchema = z.union([z.string(), z.null()]).optional().catch(undefined);

const codeGraphyWorkspaceMetaSchema = z.looseObject({
  analysisVersion: optionalNullableStringSchema,
  lastIndexedAt: optionalNullableStringSchema,
  lastIndexedCommit: optionalNullableStringSchema,
  pendingChangedFiles: looseStringArraySchema,
  failedPluginIds: looseStringArraySchema,
  pluginSignature: optionalNullableStringSchema,
  pluginBuildSignature: optionalNullableStringSchema,
  settingsSignature: optionalNullableStringSchema,
}).transform((meta): CodeGraphyWorkspaceMeta => ({
  ...createDefaultCodeGraphyWorkspaceMeta(),
  ...(meta.analysisVersion !== undefined ? { analysisVersion: meta.analysisVersion } : {}),
  ...(meta.lastIndexedAt !== undefined ? { lastIndexedAt: meta.lastIndexedAt } : {}),
  ...(meta.lastIndexedCommit !== undefined ? { lastIndexedCommit: meta.lastIndexedCommit } : {}),
  ...(meta.pluginSignature !== undefined ? { pluginSignature: meta.pluginSignature } : {}),
  ...(meta.pluginBuildSignature !== undefined ? { pluginBuildSignature: meta.pluginBuildSignature } : {}),
  ...(meta.settingsSignature !== undefined ? { settingsSignature: meta.settingsSignature } : {}),
  pendingChangedFiles: meta.pendingChangedFiles,
  failedPluginIds: meta.failedPluginIds,
  version: 1,
}));

export function createDefaultCodeGraphyWorkspaceMeta(): CodeGraphyWorkspaceMeta {
  return {
    version: 1,
    lastIndexedAt: null,
    lastIndexedCommit: null,
    pluginSignature: null,
    pluginBuildSignature: null,
    settingsSignature: null,
    analysisVersion: WORKSPACE_ANALYSIS_CACHE_VERSION,
    pendingChangedFiles: [],
    failedPluginIds: [],
  };
}

export function readCodeGraphyWorkspaceMeta(workspaceRoot: string): CodeGraphyWorkspaceMeta {
  try {
    const parsed = codeGraphyWorkspaceMetaSchema.safeParse(
      JSON.parse(fs.readFileSync(getWorkspaceMetaPath(workspaceRoot), 'utf-8')),
    );
    return parsed.success ? parsed.data : createDefaultCodeGraphyWorkspaceMeta();
  } catch {
    return createDefaultCodeGraphyWorkspaceMeta();
  }
}

function writeCodeGraphyWorkspaceMeta(
  workspaceRoot: string,
  meta: CodeGraphyWorkspaceMeta,
): void {
  const metaPath = getWorkspaceMetaPath(workspaceRoot);
  try {
    fs.mkdirSync(path.dirname(metaPath));
  } catch (error) {
    if (!isFileSystemError(error, 'EEXIST')) {
      if (isFileSystemError(error, 'ENOENT') && !fs.existsSync(workspaceRoot)) return;
      throw error;
    }
  }
  const temporaryPath = `${metaPath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(meta, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    fs.renameSync(temporaryPath, metaPath);
  } catch (error) {
    if (isFileSystemError(error, 'ENOENT') && !fs.existsSync(workspaceRoot)) return;
    throw error;
  } finally {
    fs.rmSync(temporaryPath, { force: true });
  }
}

function isFileSystemError(error: unknown, code: string): boolean {
  return error instanceof Error
    && 'code' in error
    && error.code === code;
}

export async function markCodeGraphyWorkspaceChangesPending(
  workspaceRoot: string,
  filePaths: readonly string[],
): Promise<void> {
  await updateCodeGraphyWorkspaceMeta(workspaceRoot, previous => ({
    ...previous,
    pendingChangedFiles: [...new Set([...previous.pendingChangedFiles, ...filePaths])],
  }));
}

async function updateCodeGraphyWorkspaceMeta(
  workspaceRoot: string,
  update: (previous: CodeGraphyWorkspaceMeta) => CodeGraphyWorkspaceMeta,
): Promise<void> {
  if (!fs.existsSync(workspaceRoot)) return;
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  const applyUpdate = () => {
    if (!fs.existsSync(workspaceRoot)) return;
    writeCodeGraphyWorkspaceMeta(
      workspaceRoot,
      update(readCodeGraphyWorkspaceMeta(workspaceRoot)),
    );
  };
  if (hasWorkspaceCacheWriteOwnership(databasePath)) {
    applyUpdate();
    return;
  }
  await withWorkspaceCacheWriteLockIfParentExistsAsync(databasePath, async () => {
    applyUpdate();
  });
}

export async function persistCodeGraphyWorkspaceIndexMetadata(
  workspaceRoot: string,
  metadata: {
    lastIndexedCommit?: string | null;
    pluginSignature: string | null;
    pluginBuildSignature?: string | null;
    settingsSignature: string;
    failedPluginIds?: readonly string[];
    resolvedChangedFilePaths?: readonly string[];
  },
): Promise<void> {
  await updateCodeGraphyWorkspaceMeta(workspaceRoot, previous => ({
    ...previous,
    lastIndexedAt: new Date().toISOString(),
    lastIndexedCommit: metadata.lastIndexedCommit === undefined
      ? previous.lastIndexedCommit
      : metadata.lastIndexedCommit,
    pluginSignature: metadata.pluginSignature,
    pluginBuildSignature: metadata.pluginBuildSignature === undefined
      ? previous.pluginBuildSignature
      : metadata.pluginBuildSignature,
    settingsSignature: metadata.settingsSignature,
    analysisVersion: WORKSPACE_ANALYSIS_CACHE_VERSION,
    pendingChangedFiles: metadata.resolvedChangedFilePaths === undefined
      ? []
      : previous.pendingChangedFiles.filter(
          filePath => !metadata.resolvedChangedFilePaths!.includes(filePath),
        ),
    failedPluginIds: metadata.failedPluginIds === undefined
      ? previous.failedPluginIds
      : [...metadata.failedPluginIds],
  }));
}
