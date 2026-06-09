import type { GraphNodeTypeLike } from './contracts';
import { isGraphTypeDescriptionLike } from './descriptionGuard';

export function isGraphNodeTypeLike(definition: unknown): definition is GraphNodeTypeLike {
  if (!definition || typeof definition !== 'object') {
    return false;
  }

  const record = definition as Record<string, unknown>;
  return (
    typeof record.id === 'string'
    && typeof record.label === 'string'
    && typeof record.defaultColor === 'string'
    && typeof record.defaultVisible === 'boolean'
    && (record.description === undefined || isGraphTypeDescriptionLike(record.description))
    && (record.parentId === undefined || typeof record.parentId === 'string')
  );
}
