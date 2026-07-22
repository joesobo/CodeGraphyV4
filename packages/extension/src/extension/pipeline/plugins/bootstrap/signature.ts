import type { CodeGraphyInstalledPluginRecord } from '@codegraphy-dev/core';

interface PluginRuntimeIdentity {
  id: string;
  name: string;
  version: string;
  apiVersion: string;
}

function createWorkspacePluginPackageIdentity(
  record: CodeGraphyInstalledPluginRecord,
  buildIdentity: string,
): Record<string, unknown> {
  return {
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
    buildIdentity,
  };
}

export function createWorkspacePluginDescriptorSignature(
  record: CodeGraphyInstalledPluginRecord,
  buildIdentity: string,
): string {
  return JSON.stringify(createWorkspacePluginPackageIdentity(record, buildIdentity));
}

export function createWorkspacePluginRuntimeSignature(
  record: CodeGraphyInstalledPluginRecord,
  runtime: PluginRuntimeIdentity,
  buildIdentity: string,
): string {
  return JSON.stringify({
    ...createWorkspacePluginPackageIdentity(record, buildIdentity),
    runtime: {
      id: runtime.id,
      name: runtime.name,
      version: runtime.version,
      apiVersion: runtime.apiVersion,
    },
  });
}
