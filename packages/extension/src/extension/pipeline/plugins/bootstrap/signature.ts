import type { CodeGraphyInstalledPluginRecord } from '@codegraphy-dev/core';

interface PluginRuntimeIdentity {
  id: string;
  name: string;
  version: string;
  apiVersion: string;
}

interface WorkspacePluginPackageIdentity {
  descriptor: {
    apiVersion: string;
    entry: string;
    host: string;
    id: string;
    name?: string;
  };
  package: {
    name: string;
    root: string;
    version: string;
  };
  buildIdentity: string;
}

function createWorkspacePluginPackageIdentity(
  record: CodeGraphyInstalledPluginRecord,
  buildIdentity: string,
): WorkspacePluginPackageIdentity {
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
