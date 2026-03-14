import * as vscode from 'vscode';
import type { ExtensionToWebviewMessage, IGroup } from '../../shared/types';

interface GraphViewGroupsUpdatedMessageOptions {
  workspaceFolder?: { uri: vscode.Uri };
  asWebviewUri?(uri: vscode.Uri): { toString(): string };
  resolvePluginAssetPath(assetPath: string, pluginId?: string): string | undefined;
}

function resolveGroupImageUrl(
  group: IGroup,
  options: GraphViewGroupsUpdatedMessageOptions,
): string | undefined {
  if (!group.imagePath) return undefined;

  const pluginMatch = group.id.match(/^plugin:([^:]+):/);
  if (pluginMatch) {
    return options.resolvePluginAssetPath(group.imagePath, pluginMatch[1]);
  }

  const inheritedMatch = group.imagePath.match(/^plugin:([^:]+):(.+)$/);
  if (inheritedMatch) {
    const [, pluginId, relativePath] = inheritedMatch;
    return options.resolvePluginAssetPath(relativePath, pluginId);
  }

  if (options.workspaceFolder && options.asWebviewUri) {
    return options.asWebviewUri(
      vscode.Uri.joinPath(options.workspaceFolder.uri, group.imagePath),
    ).toString();
  }

  return undefined;
}

export function buildGraphViewGroupsUpdatedMessage(
  groups: IGroup[],
  options: GraphViewGroupsUpdatedMessageOptions,
): Extract<ExtensionToWebviewMessage, { type: 'GROUPS_UPDATED' }> {
  return {
    type: 'GROUPS_UPDATED',
    payload: {
      groups: groups.map((group) => {
        const imageUrl = resolveGroupImageUrl(group, options);
        return imageUrl ? { ...group, imageUrl } : group;
      }),
    },
  };
}
