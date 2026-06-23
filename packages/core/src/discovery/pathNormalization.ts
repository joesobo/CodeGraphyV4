export function normalizeDiscoveryPath(relativePath: string): string {
  return relativePath.replace(/\\/g, '/');
}
