export interface GraphViewPluginInteractionPayload {
  event: string;
  data: unknown;
}

export interface GraphViewPluginInteractionHandlers {
  getPluginApi(pluginId: string): { deliverWebviewMessage(message: { type: string; data: unknown }): void } | undefined;
  emitEvent(event: string, payload: unknown): void;
}

export function applyPluginInteraction(
  payload: GraphViewPluginInteractionPayload,
  handlers: GraphViewPluginInteractionHandlers
): void {
  const { event, data } = payload;
  if (!event.startsWith('plugin:')) {
    handlers.emitEvent(event, data);
    return;
  }

  const [, pluginId, ...typeParts] = event.split(':');
  if (!pluginId || typeParts.length === 0) {
    return;
  }

  handlers.getPluginApi(pluginId)?.deliverWebviewMessage({
    type: typeParts.join(':'),
    data,
  });
}

export interface GraphViewPluginContextMenuPayload {
  pluginId: string;
  index: number;
  targetId: string;
  targetType: 'node' | 'edge';
}

export interface GraphViewPluginContextMenuHandlers<TNode = unknown, TEdge = unknown> {
  getPluginApi(pluginId: string): { contextMenuItems: ReadonlyArray<{ action(target: unknown): Promise<void> | void }> } | undefined;
  findNode(targetId: string): TNode | undefined;
  findEdge(targetId: string): TEdge | undefined;
  logError(message: string, error: unknown): void;
}

export async function applyPluginContextMenuAction<TNode = unknown, TEdge = unknown>(
  payload: GraphViewPluginContextMenuPayload,
  handlers: GraphViewPluginContextMenuHandlers<TNode, TEdge>
): Promise<void> {
  const api = handlers.getPluginApi(payload.pluginId);
  if (!api || payload.index >= api.contextMenuItems.length) {
    return;
  }

  const item = api.contextMenuItems[payload.index];
  const target = payload.targetType === 'node'
    ? handlers.findNode(payload.targetId)
    : handlers.findEdge(payload.targetId);

  if (!target) {
    return;
  }

  try {
    await item.action(target);
  } catch (error) {
    handlers.logError('[CodeGraphy] Plugin context menu action error:', error);
  }
}

export interface GraphViewHiddenPluginGroupsHandlers {
  hiddenPluginGroupIds: Set<string>;
  updateHiddenPluginGroups(groupIds: string[]): PromiseLike<void>;
  recomputeGroups(): void;
  sendGroupsUpdated(): void;
}

export interface GraphViewPluginGroupTogglePayload {
  groupId: string;
  disabled: boolean;
}

export async function applyPluginGroupToggle(
  payload: GraphViewPluginGroupTogglePayload,
  handlers: GraphViewHiddenPluginGroupsHandlers
): Promise<void> {
  if (payload.disabled) {
    handlers.hiddenPluginGroupIds.add(payload.groupId);
  } else {
    handlers.hiddenPluginGroupIds.delete(payload.groupId);
  }

  await handlers.updateHiddenPluginGroups([...handlers.hiddenPluginGroupIds]);
  handlers.recomputeGroups();
  handlers.sendGroupsUpdated();
}

export interface GraphViewPluginSectionTogglePayload {
  pluginId: string;
  disabled: boolean;
}

export async function applyPluginSectionToggle(
  payload: GraphViewPluginSectionTogglePayload,
  handlers: GraphViewHiddenPluginGroupsHandlers
): Promise<void> {
  const sectionKey = payload.pluginId === 'default' ? 'default' : `plugin:${payload.pluginId}`;
  if (payload.disabled) {
    handlers.hiddenPluginGroupIds.add(sectionKey);
  } else {
    handlers.hiddenPluginGroupIds.delete(sectionKey);
    const prefix = `${sectionKey}:`;
    for (const id of [...handlers.hiddenPluginGroupIds]) {
      if (id.startsWith(prefix)) {
        handlers.hiddenPluginGroupIds.delete(id);
      }
    }
  }

  await handlers.updateHiddenPluginGroups([...handlers.hiddenPluginGroupIds]);
  handlers.recomputeGroups();
  handlers.sendGroupsUpdated();
}
