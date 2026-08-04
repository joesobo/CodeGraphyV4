import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  createDefaultCodeGraphyWorkspaceMeta,
  readCodeGraphyWorkspaceMeta,
  writeCodeGraphyWorkspaceMeta,
} from '@codegraphy-dev/core';

export interface ICodeGraphyRepoMeta {
  version: 1;
  lastIndexedAt: string | null;
  lastIndexedCommit: string | null;
  pluginBuildSignature: string | null;
  pluginSignature: string | null;
  settingsSignature: string | null;
  pendingChangedFiles: string[];
}

export function createDefaultCodeGraphyRepoMeta(): ICodeGraphyRepoMeta {
  return toRepoMeta(createDefaultCodeGraphyWorkspaceMeta());
}

export function getCodeGraphyRepoMetaPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.codegraphy', 'meta.json');
}

export function readCodeGraphyRepoMeta(workspaceRoot: string): ICodeGraphyRepoMeta {
  return toRepoMeta(readCodeGraphyWorkspaceMeta(workspaceRoot));
}

export function writeCodeGraphyRepoMeta(
  workspaceRoot: string,
  meta: ICodeGraphyRepoMeta,
): void {
  if (!fs.existsSync(workspaceRoot)) {
    return;
  }

  writeCodeGraphyWorkspaceMeta(workspaceRoot, {
    ...readCodeGraphyWorkspaceMeta(workspaceRoot),
    ...meta,
  });
}

function toRepoMeta(meta: ReturnType<typeof readCodeGraphyWorkspaceMeta>): ICodeGraphyRepoMeta {
  return {
    version: 1,
    lastIndexedAt: meta.lastIndexedAt,
    lastIndexedCommit: meta.lastIndexedCommit ?? null,
    pluginBuildSignature: meta.pluginBuildSignature,
    pluginSignature: meta.pluginSignature,
    settingsSignature: meta.settingsSignature,
    pendingChangedFiles: [...meta.pendingChangedFiles],
  };
}
