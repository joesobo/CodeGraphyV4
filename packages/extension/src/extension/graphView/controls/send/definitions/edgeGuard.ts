import type { GraphEdgeTypeLike } from './contracts';

export function isGraphEdgeTypeLike(definition: unknown): definition is GraphEdgeTypeLike {
  if (!definition || typeof definition !== 'object') {
    return false;
  }

  const record = definition as Record<string, unknown>;
  return (
    typeof record.id === 'string'
    && typeof record.label === 'string'
    && typeof record.defaultColor === 'string'
    && typeof record.defaultVisible === 'boolean'
  );
}
