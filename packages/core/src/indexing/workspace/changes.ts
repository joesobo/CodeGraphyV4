import path from 'node:path';
import type { IWorkspaceAnalysisCache } from '../../analysis/cache';
import {
  createWorkspaceFileContentHash,
  hasAmbiguousWorkspaceFileTimestamp,
} from '../../analysis/cache';
import type { IDiscoveryResult } from '../../discovery/contracts';
import type { FileDiscovery } from '../../discovery/file/service';
import { getFileStat } from '../fileStat';

export type WorkspaceIndexFileContentReader = (
  file: IDiscoveryResult['files'][number],
) => Promise<string>;

export function createWorkspaceIndexFileContentReader(
  discovery: FileDiscovery,
): WorkspaceIndexFileContentReader {
  const contentByRelativePath = new Map<string, Promise<string>>();

  return (file) => {
    const cached = contentByRelativePath.get(file.relativePath);
    if (cached) return cached;

    const content = discovery.readContent(file);
    contentByRelativePath.set(file.relativePath, content);
    return content;
  };
}

export async function findChangedWorkspaceIndexFiles(input: {
  cache: IWorkspaceAnalysisCache;
  files: IDiscoveryResult['files'];
  readContent: WorkspaceIndexFileContentReader;
}): Promise<Array<IDiscoveryResult['files'][number] & { content: string }>> {
  const changedFiles = [];

  for (const file of input.files) {
    const cached = input.cache.files[file.relativePath];
    if (!cached) {
      changedFiles.push({ ...file, content: await input.readContent(file) });
      continue;
    }

    const stat = await getFileStat(file.absolutePath);
    const metadataChanged = cached.mtime !== stat?.mtime
      || (cached.size !== undefined && cached.size !== stat?.size);
    const shouldVerifyContent = metadataChanged
      || cached.contentHash === undefined
      || hasAmbiguousWorkspaceFileTimestamp(stat?.mtime);
    if (!shouldVerifyContent) continue;

    const content = await input.readContent(file);
    const contentChanged = cached.contentHash === undefined
      || cached.contentHash !== createWorkspaceFileContentHash(content);

    if (contentChanged) {
      changedFiles.push({ ...file, content });
      continue;
    }

    cached.mtime = stat?.mtime ?? 0;
    cached.size = stat?.size;
  }

  return changedFiles;
}

export async function readWorkspaceIndexAnalysisFiles(input: {
  files: IDiscoveryResult['files'];
  readContent: WorkspaceIndexFileContentReader;
}): Promise<Array<IDiscoveryResult['files'][number] & { content: string }>> {
  return Promise.all(input.files.map(async file => ({
    ...file,
    content: await input.readContent(file),
  })));
}

export function findDeletedWorkspaceIndexDependents(input: {
  cache: IWorkspaceAnalysisCache;
  deletedFilePaths: readonly string[];
  workspaceRoot: string;
}): string[] {
  const deletedFilePaths = new Set(input.deletedFilePaths);
  const deletedAbsolutePaths = new Set(input.deletedFilePaths.map(filePath => (
    path.resolve(input.workspaceRoot, filePath)
  )));

  return Object.entries(input.cache.files)
    .filter(([filePath, entry]) => (
      !deletedFilePaths.has(filePath)
      && (entry.analysis.relations ?? []).some(relation => {
        const target = relation.toFilePath ?? relation.resolvedPath;
        const absoluteTarget = typeof target === 'string'
          ? path.resolve(input.workspaceRoot, target)
          : undefined;
        return absoluteTarget !== undefined && deletedAbsolutePaths.has(absoluteTarget);
      })
    ))
    .map(([filePath]) => filePath);
}
