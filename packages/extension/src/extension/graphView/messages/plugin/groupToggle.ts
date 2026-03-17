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
	handlers: GraphViewHiddenPluginGroupsHandlers,
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
