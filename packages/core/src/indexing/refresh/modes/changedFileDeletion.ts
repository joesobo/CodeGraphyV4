import type { WorkspaceIndexRefreshSource } from '../contracts';

export function invalidateDeletedWorkspaceIndexFiles(
  source: WorkspaceIndexRefreshSource,
  filePaths: readonly string[],
): { deleteFilePaths: string[]; unmatchedFilePaths: string[] } {
  const deleteFilePaths = new Set<string>();
  const unmatchedFilePaths: string[] = [];
  for (const filePath of filePaths) {
    const invalidated = source.invalidateWorkspaceFiles([filePath], { persist: false }) ?? [];
    if (invalidated.length === 0) unmatchedFilePaths.push(filePath);
    else for (const invalidatedFilePath of invalidated) deleteFilePaths.add(invalidatedFilePath);
  }
  return { deleteFilePaths: [...deleteFilePaths], unmatchedFilePaths };
}
