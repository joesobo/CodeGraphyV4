export function getPathSegments(key: string): string[] {
  return key.split('.').filter(Boolean);
}
