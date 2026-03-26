import {
	useEffect,
	useRef,
	type MutableRefObject,
} from 'react';
import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import type { IPhysicsSettings } from '../../../../shared/contracts';
import type { FGLink, FGNode } from '../../graphModel';
import {
	applyPhysicsSettings,
	initPhysics,
} from './physics';
import {
	resolvePhysicsInitAction,
	selectActivePhysicsGraph,
	shouldApplyPhysicsUpdate,
} from './physicsRuntimeHelpers';

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
		const graph = selectActivePhysicsGraph(graphMode, fg2dRef.current, fg3dRef.current);
		if (!graph || !shouldApplyPhysicsUpdate({
			graph,
			physicsInitialised: physicsInitialisedRef.current,
			physicsSettings,
			previousPhysics: previousPhysicsRef.current,
		})) return;

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
			const action = resolvePhysicsInitAction({
				fg2d: fg2dRef.current,
				fg3d: fg3dRef.current,
				graphMode,
				physicsInitialised: physicsInitialisedRef.current,
			});
			if (action.type === 'skip') return;
			if (action.type === 'init') {
				physicsInitialisedRef.current = true;
				previousPhysicsRef.current = { ...physicsSettingsRef.current };
				initPhysics(action.instance, physicsSettingsRef.current);
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
