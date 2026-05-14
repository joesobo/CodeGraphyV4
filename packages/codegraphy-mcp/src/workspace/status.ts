import * as path from 'node:path';
import {
  readCodeGraphyWorkspaceSettings,
  readCodeGraphyWorkspaceStatus,
} from '@codegraphy/core';
import type { WorkspacePathInput, WorkspaceStatusResult } from './model';
import { resolveCodeGraphyWorkspacePath } from './paths';

export interface WorkspaceStatusDependencies {
  cwd(): string;
}

const DEFAULT_DEPENDENCIES: WorkspaceStatusDependencies = {
  cwd: () => process.cwd(),
};

function createStatusMessage(state: WorkspaceStatusResult['state']): string {
  if (state === 'fresh') {
    return 'CodeGraphy Workspace Graph Cache is fresh.';
  }

  if (state === 'stale') {
    return 'CodeGraphy Workspace Graph Cache is stale. Run `codegraphy index` to refresh it.';
  }

  return 'CodeGraphy Workspace Graph Cache is missing. Run `codegraphy index` to build it.';
}

export function readCodeGraphyWorkspaceStatusForCli(
  input: WorkspacePathInput,
  dependencies: WorkspaceStatusDependencies = DEFAULT_DEPENDENCIES,
): WorkspaceStatusResult {
  const workspaceRoot = resolveCodeGraphyWorkspacePath(input.workspacePath, dependencies.cwd());
  const status = readCodeGraphyWorkspaceStatus(workspaceRoot);
  const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);

  return {
    workspaceRoot: status.workspaceRoot,
    graphCache: path.relative(status.workspaceRoot, status.graphCachePath),
    state: status.state,
    hasGraphCache: status.hasGraphCache,
    staleReasons: status.staleReasons,
    enabledPlugins: settings.plugins.map(plugin => plugin.package),
    message: createStatusMessage(status.state),
  };
}
