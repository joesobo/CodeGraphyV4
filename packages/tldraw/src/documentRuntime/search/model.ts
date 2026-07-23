export const graphSearchEventName = 'codegraphy:graph-search';

export interface GraphSearchEventDetail {
  query: string;
}

interface SearchableShape {
  id: string;
  meta: Record<string, unknown>;
}

export interface SearchProjection<Shape extends SearchableShape> {
  hiddenShapeIds: ReadonlySet<string>;
  visibleShapes: Shape[];
}

function metadataString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function normalizeGraphSearchQuery(query: string): string {
  return query.trim().toLocaleLowerCase();
}

function visibleNodeIds(
  shapes: readonly SearchableShape[],
  query: string,
): ReadonlySet<string> {
  return new Set(
    shapes
      .filter(shape => shape.meta.codegraphyKind === 'node')
      .map(shape => metadataString(shape.meta.codegraphyEntityId))
      .filter((entityId): entityId is string => (
        entityId !== undefined && entityId.toLocaleLowerCase().includes(query)
      )),
  );
}

function isGeneratedShapeVisible(
  shape: SearchableShape,
  matchingNodeIds: ReadonlySet<string>,
): boolean {
  switch (shape.meta.codegraphyKind) {
    case 'node':
      return matchingNodeIds.has(metadataString(shape.meta.codegraphyEntityId) ?? '');
    case 'icon':
    case 'label':
      return matchingNodeIds.has(metadataString(shape.meta.codegraphyNodeId) ?? '');
    case 'edge':
      return matchingNodeIds.has(metadataString(shape.meta.codegraphyFrom) ?? '')
        && matchingNodeIds.has(metadataString(shape.meta.codegraphyTo) ?? '');
    default:
      return true;
  }
}

export function createSearchProjection<Shape extends SearchableShape>(
  shapes: readonly Shape[],
  rawQuery: string,
): SearchProjection<Shape> {
  const query = normalizeGraphSearchQuery(rawQuery);
  if (query.length === 0) {
    return {
      hiddenShapeIds: new Set<string>(),
      visibleShapes: [...shapes],
    };
  }

  const matchingNodeIds = visibleNodeIds(shapes, query);
  const hiddenShapeIds = new Set<string>();
  const visibleShapes: Shape[] = [];
  for (const shape of shapes) {
    if (isGeneratedShapeVisible(shape, matchingNodeIds)) {
      visibleShapes.push(shape);
    } else {
      hiddenShapeIds.add(shape.id);
    }
  }
  return { hiddenShapeIds, visibleShapes };
}
