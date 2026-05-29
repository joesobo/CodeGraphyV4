export function normalizeGraphMutationDirectory(directory: string): string {
  return directory === '(root)' ? '.' : directory;
}
