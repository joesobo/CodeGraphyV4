import type { GraphViewHiddenPluginGroupsHandlers } from './pluginGroupToggle';

export interface GraphViewPluginSectionTogglePayload {
	pluginId: string;
	disabled: boolean;
}

export async function applyPluginSectionToggle(
	payload: GraphViewPluginSectionTogglePayload,
	handlers: GraphViewHiddenPluginGroupsHandlers,
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
