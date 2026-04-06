import {
	useEffect,
	useRef,
	type MutableRefObject,
} from 'react';
import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods } from 'react-force-graph-3d';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { FGLink, FGNode } from '../../../model/build';
import {
	applyPhysicsSettings,
	initPhysics,
	syncPhysicsAnimation,
} from '../../physics';
import {
  resolvePhysicsInitAction,
  selectActivePhysicsGraph,
  shouldApplyPhysicsUpdate,
} from '../../physicsLifecycle';

interface UsePhysicsRuntimeOptions {
	fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
	fg3dRef: MutableRefObject<FG3DMethods<FGNode, FGLink> | undefined>;
	graphMode: '2d' | '3d';
	layoutKey: string;
	physicsPaused?: boolean;
	physicsSettings: IPhysicsSettings;
}

export function usePhysicsRuntime({
	fg2dRef,
	fg3dRef,
	graphMode,
	layoutKey,
	physicsPaused = false,
	physicsSettings,
}: UsePhysicsRuntimeOptions): void {
	const physicsInitialisedRef = useRef(false);
	const physicsSettingsRef = useRef(physicsSettings);
	const pendingThreeDimensionalInitRef = useRef(graphMode === '3d');
	const previousPhysicsRef = useRef<IPhysicsSettings | null>(null);
	const previousLayoutKeyRef = useRef<string | null>(null);

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
		const graph = selectActivePhysicsGraph(graphMode, fg2dRef.current, fg3dRef.current);
		if (!graph || !physicsInitialisedRef.current) return;

		syncPhysicsAnimation(graph, physicsPaused);
	}, [fg2dRef, fg3dRef, graphMode, physicsPaused]);

	useEffect(() => {
		physicsInitialisedRef.current = false;
		pendingThreeDimensionalInitRef.current = graphMode === '3d';
		previousPhysicsRef.current = null;
		previousLayoutKeyRef.current = null;
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
				if (graphMode === '3d' && pendingThreeDimensionalInitRef.current) {
					pendingThreeDimensionalInitRef.current = false;
					frame = requestAnimationFrame(tryInit);
					return;
				}
				physicsInitialisedRef.current = true;
				previousPhysicsRef.current = { ...physicsSettingsRef.current };
				initPhysics(action.instance, physicsSettingsRef.current);
				if (physicsPaused) {
					syncPhysicsAnimation(action.instance, true);
				}
				return;
			}

			frame = requestAnimationFrame(tryInit);
		};

		tryInit();

		return () => {
			if (frame !== null) cancelAnimationFrame(frame);
		};
	}, [fg2dRef, fg3dRef, graphMode, physicsPaused]);

	useEffect(() => {
		const graph = selectActivePhysicsGraph(graphMode, fg2dRef.current, fg3dRef.current);
		if (!graph || !physicsInitialisedRef.current) {
			return;
		}

		if (previousLayoutKeyRef.current === null) {
			previousLayoutKeyRef.current = layoutKey;
			return;
		}

		if (previousLayoutKeyRef.current === layoutKey) {
			return;
		}

		previousLayoutKeyRef.current = layoutKey;
		applyPhysicsSettings(graph, physicsSettingsRef.current);
		if (physicsPaused) {
			syncPhysicsAnimation(graph, true);
		}
	}, [fg2dRef, fg3dRef, graphMode, layoutKey, physicsPaused]);
}
