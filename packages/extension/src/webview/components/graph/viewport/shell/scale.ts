const GRAPH_VIEWPORT_SCALE_THRESHOLD = 0.01;

export interface PublishGraphViewportScaleOptions {
	globalScale: number;
	previousScale: number | null;
	publish(this: void, scale: number): void;
}

export function shouldPublishGraphViewportScale(
	previous: number | null,
	next: number,
): boolean {
	return previous === null || Math.abs(previous - next) >= GRAPH_VIEWPORT_SCALE_THRESHOLD;
}

export function publishGraphViewportScale({
	globalScale,
	previousScale,
	publish,
}: PublishGraphViewportScaleOptions): number | null {
	if (!Number.isFinite(globalScale) || globalScale <= 0) {
		return previousScale;
	}

	if (!shouldPublishGraphViewportScale(previousScale, globalScale)) {
		return previousScale;
	}

	publish(globalScale);
	return globalScale;
}
