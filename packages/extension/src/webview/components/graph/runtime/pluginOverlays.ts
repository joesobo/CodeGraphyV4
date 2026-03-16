import { useCallback } from 'react';
import type { WebviewPluginHost } from '../../../pluginHost';

export function usePluginOverlays(
	pluginHost?: WebviewPluginHost,
): (ctx: CanvasRenderingContext2D, globalScale: number) => void {
	return useCallback((ctx: CanvasRenderingContext2D, globalScale: number) => {
		if (!pluginHost) return;

		const overlays = pluginHost.getOverlays();
		if (overlays.length === 0) return;

		for (const overlay of overlays) {
			try {
				overlay.fn({
					ctx,
					width: ctx.canvas.width,
					height: ctx.canvas.height,
					globalScale,
				});
			} catch (error) {
				console.error('[CodeGraphy] Plugin overlay renderer error:', error);
			}
		}
	}, [pluginHost]);
}
