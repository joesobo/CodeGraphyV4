import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { looseStringArraySchema } from '../../shared/values';

export interface ICodeGraphyRepoMeta {
  version: 1;
  lastIndexedAt: string | null;
  lastIndexedCommit: string | null;
  pluginBuildSignature: string | null;
  pluginSignature: string | null;
  settingsSignature: string | null;
  pendingChangedFiles: string[];
}

const META_FILE_NAME = 'meta.json';

const optionalNullableStringSchema = z.union([z.string(), z.null()]).optional().catch(undefined);

const codeGraphyRepoMetaSchema = z.looseObject({
  lastIndexedAt: optionalNullableStringSchema,
  lastIndexedCommit: optionalNullableStringSchema,
  pendingChangedFiles: looseStringArraySchema,
  pluginBuildSignature: optionalNullableStringSchema,
  pluginSignature: optionalNullableStringSchema,
  settingsSignature: optionalNullableStringSchema,
}).transform((meta): ICodeGraphyRepoMeta => ({
  ...createDefaultCodeGraphyRepoMeta(),
  ...(meta.lastIndexedAt !== undefined ? { lastIndexedAt: meta.lastIndexedAt } : {}),
  ...(meta.lastIndexedCommit !== undefined ? { lastIndexedCommit: meta.lastIndexedCommit } : {}),
  ...(meta.pluginBuildSignature !== undefined ? { pluginBuildSignature: meta.pluginBuildSignature } : {}),
  ...(meta.pluginSignature !== undefined ? { pluginSignature: meta.pluginSignature } : {}),
  ...(meta.settingsSignature !== undefined ? { settingsSignature: meta.settingsSignature } : {}),
  pendingChangedFiles: meta.pendingChangedFiles,
  version: 1,
}));

export function createDefaultCodeGraphyRepoMeta(): ICodeGraphyRepoMeta {
  return {
    version: 1,
    lastIndexedAt: null,
    lastIndexedCommit: null,
    pluginBuildSignature: null,
    pluginSignature: null,
    settingsSignature: null,
    pendingChangedFiles: [],
  };
}

export function getCodeGraphyRepoMetaPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.codegraphy', META_FILE_NAME);
}

export function readCodeGraphyRepoMeta(workspaceRoot: string): ICodeGraphyRepoMeta {
  const metaPath = getCodeGraphyRepoMetaPath(workspaceRoot);

  try {
    const parsed = codeGraphyRepoMetaSchema.safeParse(JSON.parse(fs.readFileSync(metaPath, 'utf8')));
    return parsed.success ? parsed.data : createDefaultCodeGraphyRepoMeta();
  } catch {
    return createDefaultCodeGraphyRepoMeta();
  }
}

export function writeCodeGraphyRepoMeta(
  workspaceRoot: string,
  meta: ICodeGraphyRepoMeta,
): void {
  if (!fs.existsSync(workspaceRoot)) {
    return;
  }

  const metaPath = getCodeGraphyRepoMetaPath(workspaceRoot);
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
}
