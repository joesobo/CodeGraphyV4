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
  if (!api || payload.index >= api.toolbarActions.length) {
    return;
  }

  const action = api.toolbarActions[payload.index];
  if (!action || payload.itemIndex >= action.items.length) {
    return;
  }

  try {
    await action.items[payload.itemIndex]?.run();
  } catch (error) {
    handlers.logError('[CodeGraphy] Plugin toolbar action error:', error);
  }
}
