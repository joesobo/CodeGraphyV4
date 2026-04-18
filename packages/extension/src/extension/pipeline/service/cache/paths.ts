import path from 'node:path';
import type { IDiscoveredFile } from '../../../../core/discovery/contracts';

export function toWorkspaceRelativePath(
  workspaceRoot: string,
  filePath: string,
): string | undefined {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(workspaceRoot, filePath);
  const relativePath = path.relative(workspaceRoot, absolutePath).replace(/\\/g, '/');

  if (!relativePath || relativePath.startsWith('..')) {
    return undefined;
  }

  return relativePath;
}

export async function readWorkspacePipelineAnalysisFiles(
  files: readonly IDiscoveredFile[],
  readContent: (file: IDiscoveredFile) => Promise<string>,
): Promise<Array<{ absolutePath: string; relativePath: string; content: string }>> {
  const analysisFiles: Array<{ absolutePath: string; relativePath: string; content: string }> = [];

  for (const file of files) {
    analysisFiles.push({
      absolutePath: file.absolutePath,
      relativePath: file.relativePath,
      content: await readContent(file),
    });
  }

  return analysisFiles;
}
