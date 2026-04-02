import type * as vscode from 'vscode';

interface InstalledCodeGraphyExtensionLike {
  id: string;
  isActive: boolean;
  packageJSON?: {
    extensionDependencies?: string[];
  };
  activate(): PromiseLike<unknown>;
}

export function getInstalledCodeGraphyPluginExtensions(
  extensions: readonly InstalledCodeGraphyExtensionLike[],
  coreExtensionId: string,
): InstalledCodeGraphyExtensionLike[] {
  return extensions.filter((extension) => {
    if (extension.id === coreExtensionId) {
      return false;
    }

    const dependencies = extension.packageJSON?.extensionDependencies;
    return Array.isArray(dependencies) && dependencies.includes(coreExtensionId);
  });
}

export async function activateInstalledCodeGraphyPlugins(
  extensions: readonly vscode.Extension<unknown>[],
  coreExtensionId: string,
  logError: (message: string, error: unknown) => void = (message, error) => {
    console.error(message, error);
  },
): Promise<void> {
  await Promise.all(
    getInstalledCodeGraphyPluginExtensions(extensions, coreExtensionId).map(async (extension) => {
      if (extension.isActive) {
        return;
      }

      try {
        await extension.activate();
      } catch (error) {
        logError(
          `[CodeGraphy] Failed to activate dependent extension ${extension.id}:`,
          error,
        );
      }
    }),
  );
}
