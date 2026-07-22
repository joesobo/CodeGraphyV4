import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  prepareCodeGraphyWorkspacePluginPackages,
  type CodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import type {
  WorkspacePipelinePluginCandidate,
  WorkspacePipelinePluginRegistration,
} from './builtIns';
import {
  createWorkspacePluginDescriptorSignature,
  createWorkspacePluginRuntimeSignature,
} from './signature';
import { disposeRejectedPluginRuntime } from './registrationCleanup';

export interface WorkspacePackagePluginRegistrationDependencies {
  bundledPluginPackageRoots?: Iterable<string>;
  disabledPlugins?: Iterable<string>;
  userHomeDir?: string;
  warn?: (message: string) => void;
}

function readPackageInterfaceData(packageRoot: string): Array<{ id: string; data: unknown }> {
  try {
    const data: unknown = JSON.parse(
      fs.readFileSync(path.join(packageRoot, 'codegraphy.extension.json'), 'utf8'),
    );
    return [{ id: 'codegraphy.extension', data }];
  } catch {
    return [];
  }
}

export async function loadWorkspacePackagePluginRegistrations(
  settings: CodeGraphyWorkspaceSettings,
  workspaceRoot: string,
  dependencies: WorkspacePackagePluginRegistrationDependencies,
): Promise<WorkspacePipelinePluginRegistration[]> {
  const candidates = await prepareWorkspacePackagePluginCandidates(
    settings,
    workspaceRoot,
    dependencies,
  );
  const registrations: WorkspacePipelinePluginRegistration[] = [];
  const warn = dependencies.warn ?? console.warn;
  for (const candidate of candidates) {
    try {
      registrations.push(await candidate.load());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`CodeGraphy plugin '${candidate.id}' could not be loaded: ${message}`);
    }
  }
  return registrations;
}

export async function prepareWorkspacePackagePluginCandidates(
  settings: CodeGraphyWorkspaceSettings,
  workspaceRoot: string,
  dependencies: WorkspacePackagePluginRegistrationDependencies,
): Promise<WorkspacePipelinePluginCandidate[]> {
  const warn = dependencies.warn ?? console.warn;
  const preparedPackages = await prepareCodeGraphyWorkspacePluginPackages({
    bundledPackageRoots: dependencies.bundledPluginPackageRoots,
    disabledPlugins: dependencies.disabledPlugins,
    settings,
    workspaceRoot,
    homeDir: dependencies.userHomeDir,
    warn,
  });

  return preparedPackages.map(prepared => {
    const sourceSignature = createWorkspacePluginDescriptorSignature(
      prepared.record,
      prepared.buildIdentity,
    );
    const candidateOptions: WorkspacePipelinePluginRegistration['options'] = {
      ...(prepared.bundled ? { builtIn: true } : {}),
      sourcePackage: prepared.packageName,
      sourcePackageRoot: prepared.record.packageRoot,
      sourceSignature,
      ...(prepared.options ? { options: prepared.options } : {}),
      interfaces: readPackageInterfaceData(prepared.record.packageRoot),
    };
    return {
      id: prepared.record.id,
      options: candidateOptions,
      async load(): Promise<WorkspacePipelinePluginRegistration> {
        const loaded = await prepared.load();
        return {
          plugin: loaded.plugin,
          options: {
            ...candidateOptions,
            descriptorSignature: createWorkspacePluginRuntimeSignature(
              loaded.record,
              loaded.plugin,
              loaded.buildIdentity,
            ),
          },
        };
      },
    };
  });
}

export async function registerWorkspacePackagePlugins(
  registry: PluginRegistry,
  settings: CodeGraphyWorkspaceSettings,
  workspaceRoot: string,
  dependencies: WorkspacePackagePluginRegistrationDependencies,
): Promise<void> {
  const registrations = await loadWorkspacePackagePluginRegistrations(
    settings,
    workspaceRoot,
    dependencies,
  );

  const warn = dependencies.warn ?? console.warn;
  for (const registration of registrations) {
    try {
      registry.register(registration.plugin, registration.options);
    } catch (error) {
      disposeRejectedPluginRuntime(registration.plugin, warn);
      const message = error instanceof Error ? error.message : String(error);
      warn(`CodeGraphy plugin '${registration.plugin.id}' could not be registered: ${message}`);
    }
  }
}
