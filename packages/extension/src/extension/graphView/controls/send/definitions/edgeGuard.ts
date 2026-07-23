import type { GraphEdgeTypeLike } from './contracts';
import { isGraphTypeDescriptionLike } from './descriptionGuard';

export function isGraphEdgeTypeLike(definition: unknown): definition is GraphEdgeTypeLike {
  if (!definition || typeof definition !== 'object') {
    return false;
  }

  const record = definition as Record<string, unknown>;
  return (
    typeof record.id === 'string'
    && typeof record.label === 'string'
    && typeof record.defaultVisible === 'boolean'
    && (record.description === undefined || isGraphTypeDescriptionLike(record.description))
  );
}
