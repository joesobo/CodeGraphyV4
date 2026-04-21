import * as vscode from 'vscode';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IGroup } from '../../../../shared/settings/groups';
import { getMaterialThemeDefaultGroups } from './materialTheme/view';

export function getBuiltInGraphViewDefaultGroups(
  graphData: IGraphData,
  extensionUri: vscode.Uri,
): IGroup[] {
  return getMaterialThemeDefaultGroups(graphData, extensionUri);
}
