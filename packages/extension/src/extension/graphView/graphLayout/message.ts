import * as vscode from 'vscode';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type { GraphLayoutSettings, GraphLayoutSection } from '../../../shared/settings/graphLayout';
import { getCodeGraphyConfiguration } from '../../repoSettings/current';
import {
  createDefaultGraphLayoutSettings,
  normalizeGraphLayoutSettings,
} from '../../repoSettings/graphLayout/model';

export interface GraphLayoutUpdatedMessageOptions {
  workspaceFolder?: { uri: vscode.Uri };
  asWebviewUri?(uri: vscode.Uri): { toString(): string };
  iconUrls?: ReadonlyMap<string, string>;
}

function isWorkspaceGraphSectionIcon(icon: string | undefined): icon is string {
  return !!icon
    && icon.startsWith('.codegraphy/icons/')
    && !icon.includes('..')
    && /\.(svg|png)$/i.test(icon);
}

function resolveGraphSectionIconUrl(
  section: GraphLayoutSection,
  options: GraphLayoutUpdatedMessageOptions,
): string | undefined {
  const icon = section.icon;
  if (icon && options.iconUrls?.has(icon)) {
    return options.iconUrls.get(icon);
  }

  if (
    !isWorkspaceGraphSectionIcon(icon)
    || !options.workspaceFolder
    || !options.asWebviewUri
  ) {
    return undefined;
  }

  return options.asWebviewUri(
    vscode.Uri.joinPath(options.workspaceFolder.uri, icon),
  ).toString();
}

export function addGraphSectionIconUrls(
  graphLayout: GraphLayoutSettings,
  options: GraphLayoutUpdatedMessageOptions = {},
): GraphLayoutSettings {
  const sectionEntries = Object.entries(graphLayout.sections).map(([sectionId, section]) => {
    const iconUrl = resolveGraphSectionIconUrl(section, options);
    return [
      sectionId,
      iconUrl ? { ...section, iconUrl } : section,
    ] as const;
  });

  return {
    ...graphLayout,
    sections: Object.fromEntries(sectionEntries),
  };
}

export function createGraphLayoutUpdatedMessage(
  options: GraphLayoutUpdatedMessageOptions = {},
): Extract<
  ExtensionToWebviewMessage,
  { type: 'GRAPH_LAYOUT_UPDATED' }
> {
  const configuration = getCodeGraphyConfiguration();
  const graphLayout = normalizeGraphLayoutSettings(
    configuration.get('graphLayout', createDefaultGraphLayoutSettings()),
  );

  return {
    type: 'GRAPH_LAYOUT_UPDATED',
    payload: addGraphSectionIconUrls(graphLayout, options),
  };
}
