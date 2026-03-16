import {
	useEffect,
	useRef,
	type MutableRefObject,
} from 'react';
import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import type { IPhysicsSettings } from '../../../../shared/types';
import type { FGLink, FGNode } from '../../graphModel';
import {
	applyPhysicsSettings,
	havePhysicsSettingsChanged,
	initPhysics,
} from './physics';

interface UsePhysicsRuntimeOptions {
	fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
	fg3dRef: MutableRefObject<FG3DMethods<FGNode, FGLink> | undefined>;
	graphMode: '2d' | '3d';
	physicsSettings: IPhysicsSettings;
}

export function usePhysicsRuntime({
	fg2dRef,
	fg3dRef,
	graphMode,
	physicsSettings,
}: UsePhysicsRuntimeOptions): void {
	const physicsInitialisedRef = useRef(false);
	const physicsSettingsRef = useRef(physicsSettings);
	const previousPhysicsRef = useRef<IPhysicsSettings | null>(null);

	physicsSettingsRef.current = physicsSettings;

	useEffect(() => {
		const graph = graphMode === '2d' ? fg2dRef.current : fg3dRef.current;
		if (!graph || !physicsInitialisedRef.current) return;
		if (!havePhysicsSettingsChanged(previousPhysicsRef.current, physicsSettings)) return;

		previousPhysicsRef.current = { ...physicsSettings };
		applyPhysicsSettings(graph, physicsSettings);
	}, [fg2dRef, fg3dRef, graphMode, physicsSettings]);

	useEffect(() => {
		physicsInitialisedRef.current = false;
		previousPhysicsRef.current = null;
	}, [graphMode]);

	useEffect(() => {
		let frame: number | null = null;

		const tryInit = (): void => {
			if (physicsInitialisedRef.current) return;

			const instance = graphMode === '2d' ? fg2dRef.current : fg3dRef.current;
			if (instance) {
				physicsInitialisedRef.current = true;
				previousPhysicsRef.current = { ...physicsSettingsRef.current };
				initPhysics(instance, physicsSettingsRef.current);
				return;
			}

			frame = requestAnimationFrame(tryInit);
		};

		tryInit();

		return () => {
			if (frame !== null) cancelAnimationFrame(frame);
		};
	}, [fg2dRef, fg3dRef, graphMode]);
}
