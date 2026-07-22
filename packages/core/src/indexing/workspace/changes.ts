import path from 'node:path';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
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

export function findAffectedWorkspaceIndexDependents(input: {
  cache: IWorkspaceAnalysisCache;
  invalidatedFilePaths: readonly string[];
  workspaceRoot: string;
}): string[] {
  return findAffectedWorkspaceIndexAnalysisDependents({
    fileAnalysis: Object.entries(input.cache.files).map(([filePath, entry]) => (
      [filePath, entry.analysis] as const
    )),
    invalidatedFilePaths: input.invalidatedFilePaths,
    workspaceRoot: input.workspaceRoot,
  });
}

export function findAffectedWorkspaceIndexAnalysisDependents(input: {
  fileAnalysis: Iterable<readonly [string, IFileAnalysisResult]>;
  invalidatedFilePaths: readonly string[];
  workspaceRoot: string;
}): string[] {
  const dependentsByTarget = new Map<string, Set<string>>();

  for (const [filePath, analysis] of input.fileAnalysis) {
    const sourcePath = path.resolve(input.workspaceRoot, filePath);
    for (const relation of analysis.relations ?? []) {
      const target = relation.toFilePath ?? relation.resolvedPath;
      if (typeof target !== 'string') continue;

      const targetPath = path.resolve(input.workspaceRoot, target);
      const dependents = dependentsByTarget.get(targetPath) ?? new Set<string>();
      dependents.add(sourcePath);
      dependentsByTarget.set(targetPath, dependents);
    }
  }

  const invalidatedPaths = new Set(input.invalidatedFilePaths.map(filePath => (
    path.resolve(input.workspaceRoot, filePath)
  )));
  const pendingPaths = [...invalidatedPaths];
  const affectedDependents: string[] = [];
  let pendingIndex = 0;

  while (pendingIndex < pendingPaths.length) {
    const targetPath = pendingPaths[pendingIndex];
    pendingIndex += 1;

    for (const dependentPath of dependentsByTarget.get(targetPath) ?? []) {
      if (invalidatedPaths.has(dependentPath)) continue;
      invalidatedPaths.add(dependentPath);
      pendingPaths.push(dependentPath);
      affectedDependents.push(path.relative(input.workspaceRoot, dependentPath));
    }
  }

  return affectedDependents;
}
