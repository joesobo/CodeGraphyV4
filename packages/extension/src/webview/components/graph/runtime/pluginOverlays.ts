import { useCallback } from 'react';
import type { WebviewPluginHost } from '../../../pluginHost/manager';

export const PLUGIN_OVERLAY_RENDERER_ERROR = '[CodeGraphy] Plugin overlay renderer error:';

export interface PluginOverlayRenderContext {
	ctx: CanvasRenderingContext2D;
	globalScale: number;
	height: number;
	width: number;
}

export type PluginOverlayRegistration = ReturnType<WebviewPluginHost['getOverlays']>[number];

export function getPluginOverlayRegistrations(
	pluginHost?: WebviewPluginHost,
): PluginOverlayRegistration[] {
	return pluginHost ? pluginHost.getOverlays() : [];
}

export function renderPluginOverlayRegistrations(options: {
	ctx: CanvasRenderingContext2D;
	globalScale: number;
	onError?: (message?: unknown, ...optionalParams: unknown[]) => void;
	overlays: PluginOverlayRegistration[];
}): void {
	const {
		ctx,
		globalScale,
		onError = console.error,
		overlays,
	} = options;
	const renderContext: PluginOverlayRenderContext = {
		ctx,
		width: ctx.canvas.width,
		height: ctx.canvas.height,
		globalScale,
	};

	for (const overlay of overlays) {
		try {
			overlay.fn(renderContext);
		} catch (error) {
			onError(PLUGIN_OVERLAY_RENDERER_ERROR, error);
		}
	}
}

export function usePluginOverlays(
	pluginHost?: WebviewPluginHost,
): (ctx: CanvasRenderingContext2D, globalScale: number) => void {
	return useCallback((ctx: CanvasRenderingContext2D, globalScale: number) => {
		renderPluginOverlayRegistrations({
			ctx,
			globalScale,
			onError: console.error,
			overlays: getPluginOverlayRegistrations(pluginHost),
		});
	}, [pluginHost]);
}
