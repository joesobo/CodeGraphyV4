import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { WORKSPACE_ANALYSIS_CACHE_VERSION } from '../analysis/cache';
import { looseStringArraySchema } from '../values';
import { getWorkspaceMetaPath } from './paths';

export interface CodeGraphyWorkspaceMeta {
  version: 1;
  lastIndexedAt: string | null;
  pluginSignature: string | null;
  settingsSignature: string | null;
  analysisVersion: string | null;
  pendingChangedFiles: string[];
}

const optionalNullableStringSchema = z.union([z.string(), z.null()]).optional().catch(undefined);

const codeGraphyWorkspaceMetaSchema = z.looseObject({
  analysisVersion: optionalNullableStringSchema,
  lastIndexedAt: optionalNullableStringSchema,
  pendingChangedFiles: looseStringArraySchema,
  pluginSignature: optionalNullableStringSchema,
  settingsSignature: optionalNullableStringSchema,
}).transform((meta): CodeGraphyWorkspaceMeta => ({
  ...createDefaultCodeGraphyWorkspaceMeta(),
  ...(meta.analysisVersion !== undefined ? { analysisVersion: meta.analysisVersion } : {}),
  ...(meta.lastIndexedAt !== undefined ? { lastIndexedAt: meta.lastIndexedAt } : {}),
  ...(meta.pluginSignature !== undefined ? { pluginSignature: meta.pluginSignature } : {}),
  ...(meta.settingsSignature !== undefined ? { settingsSignature: meta.settingsSignature } : {}),
  pendingChangedFiles: meta.pendingChangedFiles,
  version: 1,
}));

export function createDefaultCodeGraphyWorkspaceMeta(): CodeGraphyWorkspaceMeta {
  return {
    version: 1,
    lastIndexedAt: null,
    pluginSignature: null,
    settingsSignature: null,
    analysisVersion: WORKSPACE_ANALYSIS_CACHE_VERSION,
    pendingChangedFiles: [],
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

export function writeCodeGraphyWorkspaceMeta(
  workspaceRoot: string,
  meta: CodeGraphyWorkspaceMeta,
): void {
  const metaPath = getWorkspaceMetaPath(workspaceRoot);
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
}

export function persistCodeGraphyWorkspaceIndexMetadata(
  workspaceRoot: string,
  metadata: {
    pluginSignature: string | null;
    settingsSignature: string;
  },
): void {
  const previous = readCodeGraphyWorkspaceMeta(workspaceRoot);
  writeCodeGraphyWorkspaceMeta(workspaceRoot, {
    ...previous,
    lastIndexedAt: new Date().toISOString(),
    pluginSignature: metadata.pluginSignature,
    settingsSignature: metadata.settingsSignature,
    analysisVersion: WORKSPACE_ANALYSIS_CACHE_VERSION,
    pendingChangedFiles: [],
  });
}
