import {
	useEffect,
	type MutableRefObject,
} from 'react';
import type { ForceGraphMethods as FG2DMethods, LinkObject } from 'react-force-graph-2d';
import type { FGLink, FGNode } from '../../graphModel';
import { as2DExtMethods } from '../../graphSupport';

interface UseDirectionalOptions {
	directionMode: 'arrows' | 'particles' | 'none';
	fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
	getArrowColor(this: void, link: LinkObject): string;
	getArrowRelPos(this: void, link: LinkObject): number;
	getLinkParticles(this: void, link: LinkObject): number;
	getParticleColor(this: void, link: LinkObject): string;
	graphMode: '2d' | '3d';
	particleSize: number;
	particleSpeed: number;
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
}: UseDirectionalOptions): void {
	useEffect(() => {
		if (graphMode !== '2d') return;

		const graph = as2DExtMethods(fg2dRef.current);
		if (!graph) return;

		graph.linkDirectionalArrowLength?.(directionMode === 'arrows' ? 12 : 0);
		graph.linkDirectionalArrowRelPos?.(getArrowRelPos);
		graph.linkDirectionalParticles?.(directionMode === 'particles' ? getLinkParticles : 0);
		graph.linkDirectionalParticleWidth?.(particleSize);
		graph.linkDirectionalParticleSpeed?.(particleSpeed);
		graph.linkDirectionalArrowColor?.(getArrowColor);
		graph.linkDirectionalParticleColor?.(getParticleColor);
		graph.d3ReheatSimulation();
		graph.resumeAnimation?.();
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
	]);
}
