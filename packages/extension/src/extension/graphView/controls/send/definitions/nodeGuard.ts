import type { GraphNodeTypeLike } from './contracts';
import { isGraphTypeDescriptionLike } from './descriptionGuard';

export function isGraphNodeTypeLike(definition: unknown): definition is GraphNodeTypeLike {
  if (!definition || typeof definition !== 'object') {
    return false;
  }

  const record = definition as Record<string, unknown>;
  return hasRequiredNodeTypeFields(record)
    && hasValidDescription(record.description)
    && isOptionalString(record.parentId);
}

function hasRequiredNodeTypeFields(record: Record<string, unknown>): boolean {
  return [record.id, record.label, record.defaultColor].every(value => typeof value === 'string')
    && typeof record.defaultVisible === 'boolean';
}

function hasValidDescription(description: unknown): boolean {
  return description === undefined || isGraphTypeDescriptionLike(description);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}
