import type { CodeGraphyInstalledPluginRecord } from '@codegraphy-dev/core';

interface PluginRuntimeIdentity {
  id: string;
  name: string;
  version: string;
  apiVersion: string;
}

export function createWorkspacePluginRuntimeSignature(
  record: CodeGraphyInstalledPluginRecord,
  runtime: PluginRuntimeIdentity,
): string {
  return JSON.stringify({
    descriptor: {
      id: record.id,
      name: record.name,
      host: record.host,
      entry: record.entry,
      apiVersion: record.apiVersion,
    },
    package: {
      name: record.package,
      root: record.packageRoot,
      version: record.version,
    },
    runtime: {
      id: runtime.id,
      name: runtime.name,
      version: runtime.version,
      apiVersion: runtime.apiVersion,
    },
  });
}
