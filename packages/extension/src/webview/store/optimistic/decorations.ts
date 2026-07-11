import type { IGraphData } from '../../../shared/graph/contracts';
import type { NodeDecorationPayload } from '../../../shared/plugins/decorations';
import type { OptimisticFileMutation } from './files';

export function applyPendingFileMutationDecorations(
  decorations: Record<string, NodeDecorationPayload>,
  graphData: IGraphData | null,
  pendingMutations: Readonly<Record<string, OptimisticFileMutation>>,
): Record<string, NodeDecorationPayload> {
  if (!graphData || Object.keys(pendingMutations).length === 0) return decorations;

  let projected = decorations;
  for (const node of graphData.nodes) {
    const display = projectNodeDisplay(node.id, Object.values(pendingMutations));
    if (display.path === node.id && !display.deleted) continue;
    if (projected === decorations) projected = { ...decorations };
    const current = projected[node.id];
    projected[node.id] = {
      ...current,
      ...(display.deleted ? { opacity: 0.35 } : {}),
      ...(display.path === node.id
        ? {}
        : {
            label: {
              ...current?.label,
              text: display.path.split('/').pop() ?? display.path,
            },
          }),
    };
  }
  return projected;
}

function projectNodeDisplay(
  initialPath: string,
  mutations: readonly OptimisticFileMutation[],
): { deleted: boolean; path: string } {
  let path = initialPath;
  let deleted = false;
  for (const mutation of mutations) {
    if (mutation.kind === 'rename') {
      path = renamePathPrefix(path, mutation.oldPath, mutation.newPath);
    } else if (mutation.kind === 'delete') {
      deleted ||= mutation.paths.some(
        deletedPath => path === deletedPath || path.startsWith(`${deletedPath}/`),
      );
    }
  }
  return { deleted, path };
}

function renamePathPrefix(path: string, oldPath: string, newPath: string): string {
  if (path === oldPath) return newPath;
  return path.startsWith(`${oldPath}/`)
    ? `${newPath}${path.slice(oldPath.length)}`
    : path;
}
