import * as vscode from 'vscode';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IGroup } from '../../../../shared/settings/groups';
import { createDefaultNodeVisibility } from '../../../../shared/graphControls/defaults/maps';
import { getCodeGraphyConfiguration } from '../../../repoSettings/current';
import { getMaterialThemeDefaultGroups } from './materialTheme/view';

export function getBuiltInGraphViewDefaultGroups(
  graphData: IGraphData,
  extensionUri: vscode.Uri,
): IGroup[] {
  const config = getCodeGraphyConfiguration();
  const defaultNodeVisibility = createDefaultNodeVisibility();
  const configuredNodeVisibility = config.get<Record<string, boolean>>('nodeVisibility', {}) ?? {};

  return getMaterialThemeDefaultGroups(graphData, extensionUri, {
    includeFolderMatches: configuredNodeVisibility.folder ?? defaultNodeVisibility.folder,
  });
}
