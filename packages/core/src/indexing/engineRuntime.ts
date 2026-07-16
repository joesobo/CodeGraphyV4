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
  registry?: CorePluginRegistry;
  settings?: CodeGraphyWorkspaceSettings;
}

export interface WorkspaceEngineRuntime {
  discovery: FileDiscovery;
  options: IndexCodeGraphyWorkspaceOptions;
  state: WorkspaceEngineState;
  workspaceRoot: string;
}

export function createWorkspaceEngineRuntime(
  options: IndexCodeGraphyWorkspaceOptions,
): WorkspaceEngineRuntime {
  return {
    discovery: new FileDiscovery(),
    options,
    state: {
      ...createWorkspaceIndexEngineState(),
      loadedPackagePlugins: [],
    },
    workspaceRoot: resolveWorkspaceRoot(options.workspaceRoot),
  };
}

export function hasWorkspaceEngineIndexState(state: WorkspaceEngineState): boolean {
  return Boolean(state.discoveryResult && state.registry && state.settings);
}
