import type * as vscode from 'vscode';
import type { IGraphData } from '../../../shared/graph/types';

export interface IWorkspaceFolderLike {
  uri: vscode.Uri;
}

export interface IGraphViewTransformResult {
  graphData: IGraphData;
}
