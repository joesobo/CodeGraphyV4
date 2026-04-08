export interface GraphViewPluginToolbarActionPayload {
  pluginId: string;
  index: number;
  itemIndex: number;
}

export interface GraphViewToolbarActionPluginApi {
  toolbarActions: ReadonlyArray<{
    items: ReadonlyArray<{ run(): Promise<void> | void }>;
  }>;
}

export interface GraphViewPluginToolbarActionHandlers {
  getPluginApi(pluginId: string): GraphViewToolbarActionPluginApi | undefined;
  logError(message: string, error: unknown): void;
}

export async function applyPluginToolbarAction(
  payload: GraphViewPluginToolbarActionPayload,
  handlers: GraphViewPluginToolbarActionHandlers,
): Promise<void> {
  const api = handlers.getPluginApi(payload.pluginId);
  const action = api?.toolbarActions[payload.index];
  if (!action) {
    return;
  }

  const item = action.items[payload.itemIndex];
  if (!item) {
    return;
  }

  try {
    await item.run();
  } catch (error) {
    handlers.logError('[CodeGraphy] Plugin toolbar action error:', error);
  }
}
