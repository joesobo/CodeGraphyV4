import type { IWorkspaceAnalysisCache } from '../../analysis/cache';
import { createWorkspaceFileContentHash } from '../../analysis/cache';
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
    if (!cached) continue;

    const stat = await getFileStat(file.absolutePath);
    const metadataChanged = cached.mtime !== stat?.mtime
      || (cached.size !== undefined && cached.size !== stat?.size);
    const content = await input.readContent(file);
    const contentChanged = cached.contentHash === undefined
      || cached.contentHash !== createWorkspaceFileContentHash(content);

    if (metadataChanged || contentChanged) {
      changedFiles.push({ ...file, content });
    }
  }

  return changedFiles;
}
