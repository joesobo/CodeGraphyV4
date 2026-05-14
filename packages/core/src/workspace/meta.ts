import * as fs from 'node:fs';
import * as path from 'node:path';
import { WORKSPACE_ANALYSIS_CACHE_VERSION } from '../analysis/cache';
import { getWorkspaceMetaPath } from './paths';

export interface CodeGraphyWorkspaceMeta {
  version: 1;
  lastIndexedAt: string | null;
  pluginSignature: string | null;
  settingsSignature: string | null;
  analysisVersion: string | null;
  pendingChangedFiles: string[];
}

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
    const parsed = JSON.parse(fs.readFileSync(getWorkspaceMetaPath(workspaceRoot), 'utf-8')) as Partial<CodeGraphyWorkspaceMeta>;
    return {
      ...createDefaultCodeGraphyWorkspaceMeta(),
      ...parsed,
      pendingChangedFiles: Array.isArray(parsed.pendingChangedFiles)
        ? parsed.pendingChangedFiles.filter((entry): entry is string => typeof entry === 'string')
        : [],
    };
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
