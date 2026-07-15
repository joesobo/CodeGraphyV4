import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { DEFAULT_NODE_COLOR } from '../fileColors';
import type { IGraphNode } from './contracts';
import { toRepoRelativeGraphPath } from './symbolPaths';

export function collectConnectedAnalysisFileIds(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  workspaceRoot: string,
  containingFileIds: Iterable<string>,
  includeSymbols: boolean,
): Set<string> {
  const fileIds = new Set(containingFileIds);
  for (const [filePath, analysis] of fileAnalysis) {
    const connected = (analysis.relations?.length ?? 0) > 0;
    const containsSymbols = includeSymbols && (analysis.symbols?.length ?? 0) > 0;
    if (connected || containsSymbols) fileIds.add(toRepoRelativeGraphPath(filePath, workspaceRoot));
  }
  return fileIds;
}

export function createContainingFileNode(
  filePath: string,
  cacheFiles: Record<string, { size?: number }>,
): IGraphNode {
  return {
    id: filePath,
    label: filePath.split('/').pop() ?? filePath,
    color: DEFAULT_NODE_COLOR,
    fileSize: cacheFiles[filePath]?.size,
  };
}
