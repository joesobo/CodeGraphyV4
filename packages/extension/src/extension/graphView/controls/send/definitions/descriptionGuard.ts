function isGraphTypeExampleLike(example: unknown): boolean {
  if (!example || typeof example !== 'object') return false;
  const record = example as Record<string, unknown>;
  return typeof record.code === 'string'
    && (record.label === undefined || typeof record.label === 'string');
}

export function isGraphTypeDescriptionLike(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const description = value as Record<string, unknown>;
  if (typeof description.description !== 'string') return false;
  return description.examples === undefined
    || (Array.isArray(description.examples) && description.examples.every(isGraphTypeExampleLike));
}
