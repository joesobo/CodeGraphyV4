export interface GraphViewPluginContextMenuPayload {
	pluginId: string;
	index: number;
	targetId: string;
	targetType: 'node' | 'edge';
}

export interface GraphViewPluginContextMenuHandlers<TNode = unknown, TEdge = unknown> {
	getPluginApi(pluginId: string):
		| { contextMenuItems: ReadonlyArray<{ action(target: unknown): Promise<void> | void }> }
		| undefined;
	findNode(targetId: string): TNode | undefined;
	findEdge(targetId: string): TEdge | undefined;
	logError(message: string, error: unknown): void;
}

export async function applyPluginContextMenuAction<TNode = unknown, TEdge = unknown>(
	payload: GraphViewPluginContextMenuPayload,
	handlers: GraphViewPluginContextMenuHandlers<TNode, TEdge>,
): Promise<void> {
	const api = handlers.getPluginApi(payload.pluginId);
	if (!api || payload.index >= api.contextMenuItems.length) {
		return;
	}

	const item = api.contextMenuItems[payload.index];
	const target =
		payload.targetType === 'node'
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
