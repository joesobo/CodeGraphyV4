export function matchesPathSuffix(filePath: string, suffix: string): boolean {
  return filePath === suffix || filePath.endsWith(`/${suffix}`);
}
