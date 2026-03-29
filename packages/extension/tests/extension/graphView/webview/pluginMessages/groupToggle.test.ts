import { describe, expect, it, vi } from 'vitest';
import { applyPluginGroupToggle } from '../../../../../src/extension/graphView/webview/pluginMessages/groupToggle';

function createHandlers(hiddenPluginGroupIds = new Set<string>()) {
	return {
		hiddenPluginGroupIds,
		updateHiddenPluginGroups: vi.fn(() => Promise.resolve()),
		recomputeGroups: vi.fn(),
		sendGroupsUpdated: vi.fn(),
	};
}

describe('graph view plugin group toggle message', () => {
	it('adds a disabled plugin group and refreshes merged groups', async () => {
		const handlers = createHandlers();

		await applyPluginGroupToggle({ groupId: 'plugin:test:*.ts', disabled: true }, handlers);

		expect(handlers.hiddenPluginGroupIds.has('plugin:test:*.ts')).toBe(true);
		expect(handlers.updateHiddenPluginGroups).toHaveBeenCalledWith(['plugin:test:*.ts']);
		expect(handlers.recomputeGroups).toHaveBeenCalledOnce();
		expect(handlers.sendGroupsUpdated).toHaveBeenCalledOnce();
	});

	it('removes a re-enabled plugin group', async () => {
		const handlers = createHandlers(new Set(['plugin:test:*.ts']));

		await applyPluginGroupToggle({ groupId: 'plugin:test:*.ts', disabled: false }, handlers);

		expect(handlers.hiddenPluginGroupIds.has('plugin:test:*.ts')).toBe(false);
		expect(handlers.updateHiddenPluginGroups).toHaveBeenCalledWith([]);
	});
});
