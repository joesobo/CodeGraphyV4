import type * as vscode from 'vscode';
import type { IViewContext } from '../../../core/views/contracts';
import type { IGraphData } from '../../../shared/graph/contracts';
import type { IGroup } from '../../../shared/settings/groups';
import type { NodeSizeMode } from '../../../shared/settings/modes';

export const DEFAULT_DEPTH_LIMIT = 1;
export const DEFAULT_NODE_SIZE_MODE: NodeSizeMode = 'connections';

export function createEmptyGraphData(): IGraphData {
  return { nodes: [], edges: [] };
}

export function createInitialViewContext(): IViewContext {
  return {
    activePlugins: new Set(),
    depthLimit: DEFAULT_DEPTH_LIMIT,
  };
}

export function createEmptyGroups(): IGroup[] {
  return [];
}

export function createStringSet(): Set<string> {
  return new Set<string>();
}

export function createPluginExtensionUris(): Map<string, vscode.Uri> {
  return new Map<string, vscode.Uri>();
}
