import * as vscode from 'vscode';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IGroup } from '../../../../shared/settings/groups';
import { createDefaultNodeColors, createDefaultNodeVisibility } from '../../../../shared/graphControls/defaults/maps';
import { getCodeGraphyConfiguration } from '../../../repoSettings/current';
import { getMaterialThemeDefaultGroups } from './materialTheme/view';

export function getBuiltInGraphViewDefaultGroups(
  graphData: IGraphData,
  extensionUri: vscode.Uri,
): IGroup[] {
  const config = getCodeGraphyConfiguration();
  const defaultNodeColors = createDefaultNodeColors();
  const defaultNodeVisibility = createDefaultNodeVisibility();
  const configuredNodeColors = config.get<Record<string, string>>('nodeColors', {}) ?? {};
  const configuredNodeVisibility = config.get<Record<string, boolean>>('nodeVisibility', {}) ?? {};

  return getMaterialThemeDefaultGroups(graphData, extensionUri, {
    folderNodeColor: configuredNodeColors.folder ?? defaultNodeColors.folder,
    includeFolderMatches: configuredNodeVisibility.folder ?? defaultNodeVisibility.folder,
  });
}
