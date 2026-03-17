import { describe, expect, it, vi } from 'vitest';
import { applyPluginSectionToggle } from '../../../../../src/extension/graphView/messages/plugin/sectionToggle';

function createHandlers(hiddenPluginGroupIds = new Set<string>()) {
	return {
		hiddenPluginGroupIds,
		updateHiddenPluginGroups: vi.fn(() => Promise.resolve()),
		recomputeGroups: vi.fn(),
		sendGroupsUpdated: vi.fn(),
	};
}

describe('graph view plugin section toggle message', () => {
	it('stores section-level keys when disabling a plugin section', async () => {
		const handlers = createHandlers();

		await applyPluginSectionToggle({ pluginId: 'codegraphy.typescript', disabled: true }, handlers);

		expect(handlers.hiddenPluginGroupIds.has('plugin:codegraphy.typescript')).toBe(true);
		expect(handlers.updateHiddenPluginGroups).toHaveBeenCalledWith(['plugin:codegraphy.typescript']);
	});

	it('stores the built-in defaults section key without a plugin prefix', async () => {
		const handlers = createHandlers();

		await applyPluginSectionToggle({ pluginId: 'default', disabled: true }, handlers);

		expect(handlers.hiddenPluginGroupIds.has('default')).toBe(true);
		expect(handlers.hiddenPluginGroupIds.has('plugin:default')).toBe(false);
	});

	it('clears section keys and child group entries when re-enabling a plugin section', async () => {
		const handlers = createHandlers(
			new Set([
				'plugin:codegraphy.typescript',
				'plugin:codegraphy.typescript:*.ts',
				'plugin:codegraphy.python:*.py',
			]),
		);

		await applyPluginSectionToggle({ pluginId: 'codegraphy.typescript', disabled: false }, handlers);

		expect(handlers.hiddenPluginGroupIds.has('plugin:codegraphy.typescript')).toBe(false);
		expect(handlers.hiddenPluginGroupIds.has('plugin:codegraphy.typescript:*.ts')).toBe(false);
		expect(handlers.hiddenPluginGroupIds.has('plugin:codegraphy.python:*.py')).toBe(true);
		expect(handlers.updateHiddenPluginGroups).toHaveBeenCalledWith(['plugin:codegraphy.python:*.py']);
	});
});
