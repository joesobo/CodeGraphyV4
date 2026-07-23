import type { IDiscoveryResult } from '../discovery/contracts';
import { FileDiscovery } from '../discovery/file/service';
import type { CorePluginRegistry } from '../plugins/registry';
import type { LoadedCodeGraphyWorkspacePluginPackage } from '../plugins/packageRuntime';
import { resolveWorkspaceRoot } from '../workspace/paths';
import type { CodeGraphyWorkspaceSettings } from '../workspace/settings';
import type { IndexCodeGraphyWorkspaceOptions } from './contracts';
import { createWorkspaceIndexEngineState, type WorkspaceIndexEngineState } from './state';

export interface WorkspaceEngineState extends WorkspaceIndexEngineState {
  discoveryResult?: IDiscoveryResult;
  loadedPackagePlugins: LoadedCodeGraphyWorkspacePluginPackage[];
  registeredPluginIds: Set<string>;
  failedPluginIds: Set<string>;
  registry?: CorePluginRegistry;
  settings?: CodeGraphyWorkspaceSettings;
}

export interface WorkspaceEngineRuntime {
  discovery: FileDiscovery;
  disposed: boolean;
  options: IndexCodeGraphyWorkspaceOptions;
  state: WorkspaceEngineState;
  workspaceRoot: string;
}

export function createWorkspaceEngineRuntime(
  options: IndexCodeGraphyWorkspaceOptions,
): WorkspaceEngineRuntime {
  return {
    discovery: new FileDiscovery(),
    disposed: false,
    options,
    state: {
      ...createWorkspaceIndexEngineState(),
      loadedPackagePlugins: [],
      registeredPluginIds: new Set<string>(),
      failedPluginIds: new Set<string>(),
    },
    workspaceRoot: resolveWorkspaceRoot(options.workspaceRoot),
  };
}

export function assertWorkspaceEngineActive(runtime: WorkspaceEngineRuntime): void {
  if (runtime.disposed) {
    throw new Error('CodeGraphy Workspace Engine is disposed.');
  }
}

export function hasWorkspaceEngineIndexState(state: WorkspaceEngineState): boolean {
  return Boolean(state.discoveryResult && state.registry && state.settings);
}
