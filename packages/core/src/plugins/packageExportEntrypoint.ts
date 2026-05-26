function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getEntrypointFromExports(exportsValue: unknown): string | undefined {
  if (typeof exportsValue === 'string') {
    return exportsValue;
  }

  if (!isRecord(exportsValue)) {
    return undefined;
  }

  const rootExport = exportsValue['.'] ?? exportsValue;
  if (typeof rootExport === 'string') {
    return rootExport;
  }

  if (!isRecord(rootExport)) {
    return undefined;
  }

  for (const condition of ['default', 'import', 'node', 'require']) {
    const conditionTarget = rootExport[condition];
    if (typeof conditionTarget === 'string') {
      return conditionTarget;
    }
  }

  return undefined;
}
