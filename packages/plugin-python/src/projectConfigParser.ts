export function parseSourceRootsFromRaw(raw: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }

  return sanitizeSourceRoots(parsed);
}

export function sanitizeSourceRoots(rawSourceRoots: unknown): string[] {
  if (!Array.isArray(rawSourceRoots)) {
    return [];
  }

  const uniqueRoots = new Set<string>();
  for (const candidate of rawSourceRoots) {
    if (typeof candidate !== 'string') {
      continue;
    }

    const normalized = normalizeSourceRoot(candidate);
    if (!normalized) {
      continue;
    }

    uniqueRoots.add(normalized);
  }

  return Array.from(uniqueRoots);
}

export function normalizeSourceRoot(sourceRoot: string): string | null {
  const normalized = sourceRoot
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '');

  if (!normalized || normalized === '.') {
    return null;
  }

  return normalized;
}
