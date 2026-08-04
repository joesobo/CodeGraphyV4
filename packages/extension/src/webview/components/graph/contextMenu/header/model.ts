import type {
  GraphContextMenuEdge,
  GraphContextMenuHeader,
  GraphContextMenuNode,
  GraphContextSelection,
} from '../contracts';
import { buildGraphContextMenuIdentity } from './identity';
import { readGraphContextMenuRelationship } from './relationship';

const FALLBACK_WORKSPACE_NAME = 'Workspace';

function withTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

export function buildGraphContextMenuHeader(
  selection: GraphContextSelection,
  options: {
    edges?: readonly GraphContextMenuEdge[];
    nodes?: readonly GraphContextMenuNode[];
    workspaceName?: string;
  },
): GraphContextMenuHeader | undefined {
  if (selection.kind === 'background') {
    return {
      kind: 'background',
      workspaceName: withTrailingSlash(
        options.workspaceName?.trim() || FALLBACK_WORKSPACE_NAME,
      ),
    };
  }

  if (selection.kind === 'edge') {
    const [sourceId, targetId] = selection.targets;
    if (!sourceId || !targetId) return undefined;
    return {
      kind: 'edge',
      source: buildGraphContextMenuIdentity(sourceId, options.nodes),
      target: buildGraphContextMenuIdentity(targetId, options.nodes),
      relationship: readGraphContextMenuRelationship(selection, options.edges),
    };
  }

  if (selection.targets.length === 0) return undefined;
  if (selection.targets.length > 1) {
    return { kind: 'multiNode', count: selection.targets.length };
  }

  return {
    kind: 'node',
    target: buildGraphContextMenuIdentity(selection.targets[0], options.nodes),
  };
}
