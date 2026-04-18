import {
	useEffect,
	type MutableRefObject,
} from 'react';
import type { ForceGraphMethods as FG2DMethods, LinkObject } from 'react-force-graph-2d';
import type { FGLink, FGNode } from '../../model/build';
import { as2DExtMethods, type FG2DExtMethods } from '../../support/contracts';

interface DirectionalOptions {
	directionMode: 'arrows' | 'particles' | 'none';
	getArrowColor(this: void, link: LinkObject): string;
	getArrowRelPos(this: void, link: LinkObject): number;
	getLinkParticles(this: void, link: LinkObject): number;
	getParticleColor(this: void, link: LinkObject): string;
	particleSize: number;
	particleSpeed: number;
	physicsPaused: boolean;
}

interface UseDirectionalOptions extends DirectionalOptions {
	fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
	graphMode: '2d' | '3d';
}

export function applyDirectionalSettings(
	graph: FG2DExtMethods<FGNode, FGLink>,
	{
		directionMode,
		getArrowColor,
		getArrowRelPos,
		getLinkParticles,
		getParticleColor,
		particleSize,
		particleSpeed,
		physicsPaused,
	}: DirectionalOptions,
): void {
	graph.linkDirectionalArrowLength?.(directionMode === 'arrows' ? 12 : 0);
	graph.linkDirectionalArrowRelPos?.(getArrowRelPos);
	graph.linkDirectionalParticles?.(directionMode === 'particles' ? getLinkParticles : 0);
	graph.linkDirectionalParticleWidth?.(particleSize);
	graph.linkDirectionalParticleSpeed?.(particleSpeed);
	graph.linkDirectionalArrowColor?.(getArrowColor);
	graph.linkDirectionalParticleColor?.(getParticleColor);
	graph.d3ReheatSimulation?.();
	if (!physicsPaused) {
		graph.resumeAnimation?.();
	}
}

export function useDirectional({
	directionMode,
	fg2dRef,
	getArrowColor,
	getArrowRelPos,
	getLinkParticles,
	getParticleColor,
	graphMode,
	particleSize,
	particleSpeed,
	physicsPaused,
}: UseDirectionalOptions): void {
	useEffect(() => {
		if (graphMode !== '2d') return;

		const graph = as2DExtMethods(fg2dRef.current);
		if (!graph) return;

		applyDirectionalSettings(graph, {
			directionMode,
			getArrowColor,
			getArrowRelPos,
			getLinkParticles,
			getParticleColor,
			particleSize,
			particleSpeed,
			physicsPaused,
		});
	}, [
		directionMode,
		fg2dRef,
		getArrowColor,
		getArrowRelPos,
		getLinkParticles,
		getParticleColor,
		graphMode,
		particleSize,
		particleSpeed,
		physicsPaused,
	]);
}
