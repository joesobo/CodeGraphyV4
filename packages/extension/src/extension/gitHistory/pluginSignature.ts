export interface GitHistoryPluginSignatureRegistry {
  list(): ReadonlyArray<{
    plugin: {
      id: string;
      version: string;
    };
  }>;
}

export function createGitHistoryPluginSignature(
  registry: GitHistoryPluginSignatureRegistry,
): string {
  return registry
    .list()
    .map(({ plugin }) => `${plugin.id}@${plugin.version}`)
    .sort((left, right) => left.localeCompare(right))
    .join('|');
}
