import type { CodeGraphyInstalledPluginRecord } from '@codegraphy-dev/core';

export type FindWorkspaceFiles = (
  glob: string,
  maxResults: number,
) => PromiseLike<readonly unknown[]>;

function readFileExtensionGlob(extension: string): string | undefined {
  const normalized = extension.trim().toLowerCase();
  return /^\.[a-z0-9][a-z0-9._+-]*$/.test(normalized)
    ? `**/*${normalized}`
    : undefined;
}

export async function shouldActivateWorkspacePlugin(
  record: CodeGraphyInstalledPluginRecord,
  findWorkspaceFiles: FindWorkspaceFiles,
): Promise<boolean> {
  const extensions = [...new Set(record.supportedExtensions ?? [])];
  if (extensions.length === 0 || extensions.includes('*')) {
    return true;
  }

  for (const extension of extensions) {
    const glob = readFileExtensionGlob(extension);
    if (!glob) {
      return true;
    }
    if ((await findWorkspaceFiles(glob, 1)).length > 0) {
      return true;
    }
  }

  return false;
}
