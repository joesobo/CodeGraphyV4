export function isGraphTypeDescriptionLike(description: unknown): boolean {
  if (!description || typeof description !== 'object') {
    return false;
  }

  const record = description as Record<string, unknown>;
  if (typeof record.description !== 'string') {
    return false;
  }

  if (record.examples === undefined) {
    return true;
  }

  return Array.isArray(record.examples)
    && record.examples.every((example) => {
      if (!example || typeof example !== 'object') {
        return false;
      }

      const exampleRecord = example as Record<string, unknown>;
      return (
        typeof exampleRecord.code === 'string'
        && (exampleRecord.label === undefined || typeof exampleRecord.label === 'string')
      );
    });
}
