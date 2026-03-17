export interface GraphViewPluginInteractionPayload {
	event: string;
	data: unknown;
}

export interface GraphViewPluginInteractionHandlers {
	getPluginApi(pluginId: string):
		| { deliverWebviewMessage(message: { type: string; data: unknown }): void }
		| undefined;
	emitEvent(event: string, payload: unknown): void;
}

export function applyPluginInteraction(
	payload: GraphViewPluginInteractionPayload,
	handlers: GraphViewPluginInteractionHandlers,
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
