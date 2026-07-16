import { describe, expect, it, vi } from 'vitest';
import {
	publishGraphViewportScale,
	shouldPublishGraphViewportScale,
} from '../../../../../src/webview/components/graph/viewport/shell/scale';

describe('graph/viewport/shell/scale', () => {
	it('publishes the first positive 2d scale', () => {
		const publish = vi.fn();

		const nextPreviousScale = publishGraphViewportScale({
			globalScale: 1.25,
			previousScale: null,
			publish,
		});

		expect(nextPreviousScale).toBe(1.25);
		expect(publish).toHaveBeenCalledWith(1.25);
	});

	it('publishes the first 2d scale even when it is below the change threshold', () => {
		const publish = vi.fn();

		const nextPreviousScale = publishGraphViewportScale({
			globalScale: 0.005,
			previousScale: null,
			publish,
		});

		expect(nextPreviousScale).toBe(0.005);
		expect(publish).toHaveBeenCalledWith(0.005);
	});

	it('keeps the previous scale for non-positive or non-finite scales', () => {
		const publish = vi.fn();

		for (const globalScale of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(publishGraphViewportScale({
				globalScale,
				previousScale: 1,
				publish,
			})).toBe(1);
		}

		expect(publish).not.toHaveBeenCalled();
	});

	it('does not republish small scale changes', () => {
		const publish = vi.fn();

		const nextPreviousScale = publishGraphViewportScale({
			globalScale: 1.005,
			previousScale: 1,
			publish,
		});

		expect(nextPreviousScale).toBe(1);
		expect(publish).not.toHaveBeenCalled();
	});

	it('publishes scale changes at the minimum threshold', () => {
		const publish = vi.fn();

		expect(shouldPublishGraphViewportScale(0, 0.01)).toBe(true);

		const nextPreviousScale = publishGraphViewportScale({
			globalScale: 1.02,
			previousScale: 1,
			publish,
		});

		expect(nextPreviousScale).toBe(1.02);
		expect(publish).toHaveBeenCalledWith(1.02);
	});
});
