import * as vscode from 'vscode';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { LegendIconImport } from '../../../../shared/protocol/webviewToExtension';
import type { IGroup } from '../../../../shared/settings/groups';

export interface GraphViewLegendMessageState {
  userLegends: IGroup[];
}

export interface GraphViewLegendMessageHandlers {
  workspaceFolder?: { uri: vscode.Uri };
  createDirectory(uri: vscode.Uri): Thenable<void>;
  writeFile(uri: vscode.Uri, content: Uint8Array): Thenable<void>;
  persistLegends(legends: IGroup[]): Promise<void>;
  persistDefaultLegendVisibility(legendId: string, visible: boolean): Promise<void>;
  persistLegendOrder(legendIds: string[]): Promise<void>;
  recomputeGroups(): void;
  sendGroupsUpdated(): void;
}

function toPersistableGroup(group: IGroup): IGroup {
  const persistable = { ...group };
  delete persistable.imageUrl;
  delete persistable.isPluginDefault;
  delete persistable.pluginId;
  delete persistable.pluginName;
  return persistable;
}

function isSafeIconImport(iconImport: LegendIconImport): boolean {
  return (
    iconImport.imagePath.startsWith('.codegraphy/icons/')
    && !iconImport.imagePath.includes('..')
    && /\.(svg|png)$/i.test(iconImport.imagePath)
  );
}

async function writeLegendIconImports(
  iconImports: LegendIconImport[] | undefined,
  handlers: GraphViewLegendMessageHandlers,
): Promise<void> {
  if (!iconImports?.length || !handlers.workspaceFolder) {
    return;
  }

  const iconDirectory = vscode.Uri.joinPath(
    handlers.workspaceFolder.uri,
    '.codegraphy',
    'icons',
  );
  await handlers.createDirectory(iconDirectory);

  for (const iconImport of iconImports) {
    if (!isSafeIconImport(iconImport)) {
      continue;
    }

    await handlers.writeFile(
      vscode.Uri.joinPath(handlers.workspaceFolder.uri, iconImport.imagePath),
      Uint8Array.from(Buffer.from(iconImport.contentsBase64, 'base64')),
    );
  }
}

export async function applyLegendMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewLegendMessageState,
  handlers: GraphViewLegendMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'UPDATE_LEGENDS':
      await writeLegendIconImports(message.payload.iconImports, handlers);
      state.userLegends = message.payload.legends.map(toPersistableGroup);
      await handlers.persistLegends(state.userLegends);
      return true;

    case 'UPDATE_DEFAULT_LEGEND_VISIBILITY':
      await handlers.persistDefaultLegendVisibility(
        message.payload.legendId,
        message.payload.visible,
      );
      handlers.recomputeGroups();
      handlers.sendGroupsUpdated();
      return true;

    case 'UPDATE_LEGEND_ORDER':
      await handlers.persistLegendOrder(message.payload.legendIds);
      handlers.recomputeGroups();
      handlers.sendGroupsUpdated();
      return true;

    default:
      return false;
  }
}
