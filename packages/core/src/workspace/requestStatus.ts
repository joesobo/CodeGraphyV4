import * as path from 'node:path';
import { createDiagnosticEvent } from '../diagnostics/events';
import { createPluginActivityState } from '../plugins/activityState/model';
import { readCodeGraphyInstalledPluginCache } from '../plugins/installedCache';
import {
  readCodeGraphyWorkspaceSettingsOrInitial,
} from './settings';
import { readCodeGraphyWorkspaceStatus } from './status';
import { resolveCodeGraphyWorkspacePath } from './requestPaths';
import type { WorkspacePathInput, WorkspaceStatusResult } from './requestTypes';
import { CODEGRAPHY_MARKDOWN_PLUGIN_ID } from './settings';

export interface WorkspaceStatusDependencies {
  cwd(): string;
  homeDir?: string;
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
  const status = readCodeGraphyWorkspaceStatus(workspaceRoot, {
    ...(dependencies.homeDir ? { userHomeDir: dependencies.homeDir } : {}),
  });
  const settings = readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot);
  const activity = createPluginActivityState({
    settings,
    installedPlugins: readCodeGraphyInstalledPluginCache({
      ...(dependencies.homeDir ? { homeDir: dependencies.homeDir } : {}),
    }).plugins,
    builtInPluginIds: [CODEGRAPHY_MARKDOWN_PLUGIN_ID],
  });
  const enabledPlugins = [...activity.activePluginIds];
  input.diagnostics?.emit(createDiagnosticEvent({
    area: 'workspace',
    event: 'status-read',
    context: {
      workspaceRoot: status.workspaceRoot,
      graphCache: path.relative(status.workspaceRoot, status.graphCachePath),
      state: status.state,
      hasGraphCache: status.hasGraphCache,
      staleReasons: status.staleReasons,
      enabledPluginCount: enabledPlugins.length,
    },
  }));

  return {
    workspaceRoot: status.workspaceRoot,
    graphCache: path.relative(status.workspaceRoot, status.graphCachePath),
    state: status.state,
    hasGraphCache: status.hasGraphCache,
    staleReasons: status.staleReasons,
    enabledPlugins,
    message: createStatusMessage(status.state),
  };
}
