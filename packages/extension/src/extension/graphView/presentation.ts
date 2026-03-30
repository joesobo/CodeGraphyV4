import type * as vscode from 'vscode';
import type { IGraphData } from '../../shared/graph/types';
import type { IAvailableView } from '../../shared/view/types';
import type { IViewContext, IViewInfo } from '../../core/views/contracts';
import type { ViewRegistry } from '../../core/views/registry';

interface IWorkspaceFolderLike {
  uri: vscode.Uri;
}

export interface IGraphViewTransformResult {
  activeViewId: string;
  graphData: IGraphData;
  persistSelectedViewId?: string;
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
  const viewInfo = viewRegistry.get(activeViewId);

  if (!viewInfo || !viewRegistry.isViewAvailable(activeViewId, viewContext)) {
    const defaultId = viewRegistry.getDefaultViewId();
    if (defaultId && defaultId !== activeViewId) {
      const defaultView = viewRegistry.get(defaultId);
      if (defaultView) {
        return {
          activeViewId: defaultId,
          graphData: defaultView.view.transform(rawGraphData, viewContext),
          persistSelectedViewId: defaultId,
        };
      }
    }

    return {
      activeViewId,
      graphData: rawGraphData,
    };
  }

  return {
    activeViewId,
    graphData: viewInfo.view.transform(rawGraphData, viewContext),
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
