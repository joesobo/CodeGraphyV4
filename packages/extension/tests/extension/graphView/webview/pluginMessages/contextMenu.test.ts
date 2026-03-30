import { describe, expect, it, vi } from 'vitest';
import { applyPluginContextMenuAction } from '../../../../../src/extension/graphView/webview/pluginMessages/contextMenu';

describe('graph view plugin context menu message', () => {
	it('runs plugin context menu actions for node targets', async () => {
		const action = vi.fn(() => Promise.resolve());
		const node = { id: 'src/app.ts' };

		await applyPluginContextMenuAction(
			{
				pluginId: 'test.plugin',
				index: 0,
				targetId: 'src/app.ts',
				targetType: 'node',
			},
			{
				getPluginApi: () => ({ contextMenuItems: [{ action }] }),
				findNode: () => node,
				findEdge: vi.fn(),
				logError: vi.fn(),
			},
		);

		expect(action).toHaveBeenCalledWith(node);
	});

	it('runs plugin context menu actions for edge targets', async () => {
		const action = vi.fn(() => Promise.resolve());
		const edge = { id: 'src/app.ts->src/lib.ts' };

		await applyPluginContextMenuAction(
			{
				pluginId: 'test.plugin',
				index: 0,
				targetId: edge.id,
				targetType: 'edge',
			},
			{
				getPluginApi: () => ({ contextMenuItems: [{ action }] }),
				findNode: vi.fn(),
				findEdge: () => edge,
				logError: vi.fn(),
			},
		);

		expect(action).toHaveBeenCalledWith(edge);
	});

	it('logs plugin context menu action failures', async () => {
		const error = new Error('boom');
		const logError = vi.fn();

		await applyPluginContextMenuAction(
			{
				pluginId: 'test.plugin',
				index: 0,
				targetId: 'src/app.ts',
				targetType: 'node',
			},
			{
				getPluginApi: () => ({
					contextMenuItems: [{ action: vi.fn(() => Promise.reject(error)) }],
				}),
				findNode: () => ({ id: 'src/app.ts' }),
				findEdge: vi.fn(),
				logError,
			},
		);

		expect(logError).toHaveBeenCalledWith('[CodeGraphy] Plugin context menu action error:', error);
	});

	it('ignores plugin context menu actions when the plugin api is missing', async () => {
		const findNode = vi.fn(() => ({ id: 'src/app.ts' }));
		const findEdge = vi.fn();
		const logError = vi.fn();

		await applyPluginContextMenuAction(
			{
				pluginId: 'missing.plugin',
				index: 0,
				targetId: 'src/app.ts',
				targetType: 'node',
			},
			{
				getPluginApi: () => undefined,
				findNode,
				findEdge,
				logError,
			},
		);

		expect(findNode).not.toHaveBeenCalled();
		expect(findEdge).not.toHaveBeenCalled();
		expect(logError).not.toHaveBeenCalled();
	});

	it('ignores plugin context menu actions with out-of-range indexes', async () => {
		const action = vi.fn();
		const findNode = vi.fn(() => ({ id: 'src/app.ts' }));
		const logError = vi.fn();

		await applyPluginContextMenuAction(
			{
				pluginId: 'test.plugin',
				index: 1,
				targetId: 'src/app.ts',
				targetType: 'node',
			},
			{
				getPluginApi: () => ({ contextMenuItems: [{ action }] }),
				findNode,
				findEdge: vi.fn(),
				logError,
			},
		);

		expect(action).not.toHaveBeenCalled();
		expect(findNode).not.toHaveBeenCalled();
		expect(logError).not.toHaveBeenCalled();
	});

	it('ignores plugin context menu actions with missing targets', async () => {
		const action = vi.fn();

		await applyPluginContextMenuAction(
			{
				pluginId: 'test.plugin',
				index: 0,
				targetId: 'missing.ts',
				targetType: 'node',
			},
			{
				getPluginApi: () => ({ contextMenuItems: [{ action }] }),
				findNode: () => undefined,
				findEdge: vi.fn(),
				logError: vi.fn(),
			},
		);

		expect(action).not.toHaveBeenCalled();
	});
});
