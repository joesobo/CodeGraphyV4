import type { GraphNodeTypeLike } from './contracts';

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
  );
}
