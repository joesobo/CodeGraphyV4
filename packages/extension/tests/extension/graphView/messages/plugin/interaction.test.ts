import { describe, expect, it, vi } from 'vitest';
import { applyPluginInteraction } from '../../../../../src/extension/graphView/messages/plugin/interaction';

describe('graph view plugin interaction message', () => {
	it('routes plugin graph interactions to the plugin api', () => {
		const deliverWebviewMessage = vi.fn();

		applyPluginInteraction(
			{ event: 'plugin:test.plugin:ping', data: { ok: true } },
			{
				getPluginApi: () => ({ deliverWebviewMessage }),
				emitEvent: vi.fn(),
			},
		);

		expect(deliverWebviewMessage).toHaveBeenCalledWith({
			type: 'ping',
			data: { ok: true },
		});
	});

	it('preserves nested plugin event names when forwarding to the plugin api', () => {
		const deliverWebviewMessage = vi.fn();

		applyPluginInteraction(
			{ event: 'plugin:test.plugin:graph:event', data: { ok: true } },
			{
				getPluginApi: () => ({ deliverWebviewMessage }),
				emitEvent: vi.fn(),
			},
		);

		expect(deliverWebviewMessage).toHaveBeenCalledWith({
			type: 'graph:event',
			data: { ok: true },
		});
	});

	it('emits non-plugin graph interactions on the event bus', () => {
		const emitEvent = vi.fn();

		applyPluginInteraction(
			{ event: 'graph:nodeClick', data: { nodeId: 'src/app.ts' } },
			{
				getPluginApi: vi.fn(),
				emitEvent,
			},
		);

		expect(emitEvent).toHaveBeenCalledWith('graph:nodeClick', { nodeId: 'src/app.ts' });
	});

	it('ignores malformed plugin graph interactions', () => {
		const emitEvent = vi.fn();
		const getPluginApi = vi.fn();

		applyPluginInteraction(
			{ event: 'plugin:test.plugin', data: { ok: true } },
			{
				getPluginApi,
				emitEvent,
			},
		);

		expect(getPluginApi).not.toHaveBeenCalled();
		expect(emitEvent).not.toHaveBeenCalled();
	});

	it('ignores plugin graph interactions when no plugin api is available', () => {
		expect(() =>
			applyPluginInteraction(
				{ event: 'plugin:test.plugin:ping', data: { ok: true } },
				{
					getPluginApi: () => undefined,
					emitEvent: vi.fn(),
				},
			),
		).not.toThrow();
	});
});
