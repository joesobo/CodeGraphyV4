import * as path from 'node:path';
import { createDiagnosticEvent } from '../diagnostics/events';
import {
  readCodeGraphyWorkspaceSettingsOrInitial,
} from './settings';
import { readCodeGraphyWorkspaceStatus } from './status';
import { resolveCodeGraphyWorkspacePath } from './requestPaths';
import type { WorkspacePathInput, WorkspaceStatusResult } from './requestTypes';

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
  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  input.diagnostics?.emit(createDiagnosticEvent({
    area: 'workspace',
    event: 'status-read',
    context: {
      workspaceRoot: status.workspaceRoot,
      graphCache: path.relative(status.workspaceRoot, status.graphCachePath),
      state: status.state,
      hasGraphCache: status.hasGraphCache,
      staleReasons: status.staleReasons,
      enabledPluginCount: settings.plugins.length,
    },
  }));

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
