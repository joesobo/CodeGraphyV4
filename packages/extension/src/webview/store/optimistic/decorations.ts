import type { IGraphData } from '../../../shared/graph/contracts';
import type { NodeDecorationPayload } from '../../../shared/plugins/decorations';
import type { OptimisticFileMutation } from './files';

export function applyPendingFileMutationDecorations(
  decorations: Record<string, NodeDecorationPayload>,
  graphData: IGraphData | null,
  pendingMutations: Readonly<Record<string, OptimisticFileMutation>>,
): Record<string, NodeDecorationPayload> {
  if (!graphData || Object.keys(pendingMutations).length === 0) return decorations;

  const mutations = Object.values(pendingMutations);
  if (mutations.length === 1) {
    const direct = applySingleFileMutationDecoration(
      decorations,
      graphData,
      mutations[0],
    );
    if (direct) return direct;
  }

  let projected = decorations;
  for (const node of graphData.nodes) {
    const display = projectNodeDisplay(node.id, mutations);
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

function applySingleFileMutationDecoration(
  decorations: Record<string, NodeDecorationPayload>,
  graphData: IGraphData,
  mutation: OptimisticFileMutation,
): Record<string, NodeDecorationPayload> | undefined {
  if (mutation.kind === 'create') return decorations;
  if (mutation.kind === 'rename') {
    const node = graphData.nodes.find(candidate => candidate.id === mutation.oldPath);
    if (node?.nodeType !== 'file') return undefined;
    const current = decorations[node.id];
    return {
      ...decorations,
      [node.id]: {
        ...current,
        label: {
          ...current?.label,
          text: mutation.newPath.split('/').pop() ?? mutation.newPath,
        },
      },
    };
  }
  const projected = { ...decorations };
  for (const path of mutation.paths) {
    const node = graphData.nodes.find(candidate => candidate.id === path);
    if (node?.nodeType !== 'file') return undefined;
    projected[node.id] = { ...projected[node.id], opacity: 0.35 };
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
