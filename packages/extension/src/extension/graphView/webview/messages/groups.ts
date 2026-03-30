import * as path from 'path';
import * as vscode from 'vscode';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { IGroup } from '../../../../shared/settings/groups';

export interface GraphViewGroupMessageState {
  userGroups: IGroup[];
}

export interface GraphViewGroupMessageHandlers {
  workspaceFolder?: { uri: vscode.Uri };
  persistGroups(groups: IGroup[]): Promise<void>;
  recomputeGroups(): void;
  sendGroupsUpdated(): void;
  showOpenDialog(
    options: vscode.OpenDialogOptions,
  ): PromiseLike<readonly vscode.Uri[] | undefined>;
  createDirectory(uri: vscode.Uri): PromiseLike<void>;
  copyFile(
    source: vscode.Uri,
    destination: vscode.Uri,
    options: { overwrite: boolean },
  ): PromiseLike<void>;
}

function toPersistableGroup(group: IGroup): IGroup {
  const persistable = { ...group };
  delete persistable.imageUrl;
  delete persistable.isPluginDefault;
  delete persistable.pluginName;
  return persistable;
}

async function pickGroupImage(
  groupId: string,
  state: GraphViewGroupMessageState,
  handlers: GraphViewGroupMessageHandlers,
): Promise<void> {
  const uris = await handlers.showOpenDialog({
    canSelectMany: false,
    filters: { Images: ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'ico'] },
    openLabel: 'Select Image',
  });
  if (!uris || uris.length === 0 || !handlers.workspaceFolder) {
    return;
  }

  const assetsDir = vscode.Uri.joinPath(handlers.workspaceFolder.uri, '.codegraphy', 'assets');
  try {
    await handlers.createDirectory(assetsDir);
  } catch {
    // Directory may already exist; keep going.
  }

  const selectedUri = uris[0];
  const fileName = path.basename(selectedUri.fsPath);
  const destinationUri = vscode.Uri.joinPath(assetsDir, fileName);
  await handlers.copyFile(selectedUri, destinationUri, { overwrite: true });

  const group = state.userGroups.find((candidate) => candidate.id === groupId);
  if (!group) {
    return;
  }

  group.imagePath = `.codegraphy/assets/${fileName}`;
  await handlers.persistGroups(state.userGroups);
  handlers.recomputeGroups();
  handlers.sendGroupsUpdated();
}

export async function applyGroupMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewGroupMessageState,
  handlers: GraphViewGroupMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'UPDATE_GROUPS':
      state.userGroups = message.payload.groups.map(toPersistableGroup);
      await handlers.persistGroups(state.userGroups);
      handlers.recomputeGroups();
      handlers.sendGroupsUpdated();
      return true;

    case 'PICK_GROUP_IMAGE':
      await pickGroupImage(message.payload.groupId, state, handlers);
      return true;

    default:
      return false;
  }
}
