export type CodeGraphyPluginDisclosure =
  | 'network'
  | 'secrets'
  | 'externalProcesses'
  | 'workspaceWrites'
  | 'outsideWorkspaceWrites'
  | 'extraFileReads';

export function readDisclosures(value: unknown): CodeGraphyPluginDisclosure[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is CodeGraphyPluginDisclosure =>
    entry === 'network'
    || entry === 'secrets'
    || entry === 'externalProcesses'
    || entry === 'workspaceWrites'
    || entry === 'outsideWorkspaceWrites'
    || entry === 'extraFileReads',
  );
}
