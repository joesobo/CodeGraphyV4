import { cssColorRevision } from '../../../cssColors/resolver';
import type { GraphCallbackContext } from './useGraphCallbacks';

function styleSnapshot(context: GraphCallbackContext): unknown[] {
  return [cssColorRevision(), context.edgeDecorationsRef.current, context.graphAppearanceRef.current,
    context.highlightedNeighborsRef.current, context.highlightedNodeRef.current,
    context.nodeDecorationsRef.current, context.selectedNodesSetRef.current];
}

export function createGraphStyleRevision(): (context: GraphCallbackContext) => number {
  let revision = 0;
  let previous: unknown[] | undefined;
  return context => {
    const current = styleSnapshot(context);
    if (previous && current.every((value, index) => value === previous?.[index])) return revision;
    previous = current;
    revision += 1;
    return revision;
  };
}
