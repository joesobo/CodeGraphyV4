import { useEffect, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from 'react';
import type { WebGpuGraphRenderer } from '@codegraphy-dev/graph-renderer';
import type { OwnedGraphLayout } from '../../layout/runtime/model';
import type { OwnedGraphPerformanceMonitor } from '../../frame/performance/model';
import {
  completeOwnedGraphPerformanceFrame,
  discardOwnedGraphPerformanceFrame,
  resetOwnedGraphPerformance,
} from '../../frame/performance/presentation';
import { startOwnedGraphRendererLifecycle, type OwnedGraphRendererStatus } from './lifecycle';
import type { GraphLayoutFixedTimestepClock } from '../../simulation/timing/clock';

interface Options {
  engineStopNotifiedRef: MutableRefObject<boolean>; fpsOutputRef: RefObject<HTMLOutputElement | null>;
  fpsRef: MutableRefObject<number | null>; frameRequestedRef: MutableRefObject<boolean>;
  gpuCanvasRef: RefObject<HTMLCanvasElement | null>; gpuRendererRef: MutableRefObject<WebGpuGraphRenderer | null>;
  layoutRef: MutableRefObject<OwnedGraphLayout | null>; performanceMonitorRef: MutableRefObject<OwnedGraphPerformanceMonitor>;
  rendererOperationalRef: MutableRefObject<boolean>; requestFrameRef: MutableRefObject<() => void>;
  setRendererError: Dispatch<SetStateAction<string | null>>; setRendererStatus: Dispatch<SetStateAction<OwnedGraphRendererStatus>>;
  simulationClockRef: MutableRefObject<GraphLayoutFixedTimestepClock>;
}

export function useOwnedRendererLifecycle(options: Options): void {
  const {
    engineStopNotifiedRef, fpsOutputRef, fpsRef, frameRequestedRef, gpuCanvasRef,
    gpuRendererRef, layoutRef, performanceMonitorRef, rendererOperationalRef,
    requestFrameRef, setRendererError, setRendererStatus, simulationClockRef,
  } = options;
  useEffect(() => {
    const canvas = gpuCanvasRef.current;
    if (!canvas) return;
    const resetPerformance = () => resetOwnedGraphPerformance(performanceMonitorRef.current, fpsRef, fpsOutputRef.current);
    const lifecycle = startOwnedGraphRendererLifecycle({
      engineStopNotifiedRef, frameRequestedRef, gpuRendererRef, layoutRef,
      rendererOperationalRef, requestFrameRef, simulationClockRef,
      onError: message => { resetPerformance(); setRendererError(message); setRendererStatus('error'); },
      onFrameComplete: submissionId => completeOwnedGraphPerformanceFrame(
        performanceMonitorRef.current,
        submissionId,
        fpsRef,
        fpsOutputRef.current,
      ),
      onFrameRejected: submissionId => discardOwnedGraphPerformanceFrame(
        performanceMonitorRef.current,
        submissionId,
        fpsRef,
        fpsOutputRef.current,
      ),
      onReady: () => { setRendererError(null); setRendererStatus('webgpu'); },
      onRecovering: () => { resetPerformance(); setRendererError(null); setRendererStatus('initializing'); },
    }, canvas);
    return () => lifecycle.dispose();
  }, [engineStopNotifiedRef, fpsOutputRef, fpsRef, frameRequestedRef, gpuCanvasRef,
    gpuRendererRef, layoutRef, performanceMonitorRef, rendererOperationalRef,
    requestFrameRef, setRendererError, setRendererStatus, simulationClockRef]);
}
