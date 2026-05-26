export interface PluginRegistrationCandidate {
  enabled?: unknown;
  id: string;
  packageName?: string;
}

export function toPluginRegistrationCandidate(plugin: unknown): PluginRegistrationCandidate | null {
  if (!plugin || typeof plugin !== 'object') {
    return null;
  }

  const candidate = plugin as { enabled?: unknown; id?: unknown; packageName?: unknown };
  if (typeof candidate.id !== 'string') {
    return null;
  }

  return {
    enabled: candidate.enabled,
    id: candidate.id,
    packageName: typeof candidate.packageName === 'string'
      ? candidate.packageName
      : undefined,
  };
}
