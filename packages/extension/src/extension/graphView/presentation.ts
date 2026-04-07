import type * as vscode from 'vscode';
import type { IGraphData } from '../../shared/graph/types';
import type { IAvailableView } from '../../shared/view/types';
import type { IViewContext, IViewInfo } from '../../core/views/contracts';
import type { ViewRegistry } from '../../core/views/registry';
import { filterDanglingDiffGraphEdges } from '../gitHistory/diff/snapshot';

interface IWorkspaceFolderLike {
  uri: vscode.Uri;
}

export interface IGraphViewTransformResult {
  activeViewId: string;
  graphData: IGraphData;
  persistSelectedViewId?: string;
}

const PACKAGE_NODE_VIEW_IDS = new Set(['codegraphy.typescript.focused-imports']);

function filterSyntheticPackageNodes(
  graphData: IGraphData,
  activeViewId: string,
): IGraphData {
  if (PACKAGE_NODE_VIEW_IDS.has(activeViewId)) {
    return graphData;
  }

  const allowedNodeIds = new Set(
    graphData.nodes
      .filter((node) => node.nodeType !== 'package')
      .map((node) => node.id),
  );
  const nodes = graphData.nodes.filter((node) => allowedNodeIds.has(node.id));

  return {
    nodes,
    edges: filterDanglingDiffGraphEdges(nodes, graphData.edges),
  };
}

export function getRelativeWorkspacePath(
  uri: vscode.Uri,
  workspaceFolders: readonly IWorkspaceFolderLike[] | undefined,
  asRelativePath: (uri: vscode.Uri, includeWorkspaceFolder?: boolean) => string
): string | undefined {
  const workspaceFolder = workspaceFolders?.[0];
  if (!workspaceFolder) return undefined;

  const relativePath = asRelativePath(uri, false);
  return relativePath !== uri.fsPath ? relativePath : undefined;
}

export function applyGraphViewTransform(
  viewRegistry: Pick<ViewRegistry, 'get' | 'isViewAvailable' | 'getDefaultViewId'>,
  activeViewId: string,
  viewContext: IViewContext,
  rawGraphData: IGraphData
): IGraphViewTransformResult {
  const graphDataForActiveView = filterSyntheticPackageNodes(rawGraphData, activeViewId);
  const viewInfo = viewRegistry.get(activeViewId);

  if (!viewInfo || !viewRegistry.isViewAvailable(activeViewId, viewContext)) {
    const defaultId = viewRegistry.getDefaultViewId();
    if (defaultId && defaultId !== activeViewId) {
      const defaultView = viewRegistry.get(defaultId);
      if (defaultView) {
        const graphDataForDefaultView = filterSyntheticPackageNodes(rawGraphData, defaultId);
        return {
          activeViewId: defaultId,
          graphData: defaultView.view.transform(graphDataForDefaultView, viewContext),
          persistSelectedViewId: defaultId,
        };
      }
    }

    return {
      activeViewId,
      graphData: graphDataForActiveView,
    };
  }

  return {
    activeViewId,
    graphData: viewInfo.view.transform(graphDataForActiveView, viewContext),
  };
}

export function mapAvailableViews(
  availableViews: readonly IViewInfo[],
  activeViewId: string
): IAvailableView[] {
  return availableViews.map((info) => ({
    id: info.view.id,
    name: info.view.name,
    icon: info.view.icon,
    description: info.view.description,
    active: info.view.id === activeViewId,
  }));
}
