import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';

export function resetPendingAutoFit(
  pendingAutoFitRef: MutableRefObject<boolean>,
): void {
  pendingAutoFitRef.current = true;
}

export function schedulePending3dAutoFit({
  fitView,
  graphReady,
  graphMode,
  pendingAutoFitRef,
}: {
  fitView(this: void): void;
  graphReady: boolean;
  graphMode: '2d' | '3d';
  pendingAutoFitRef: MutableRefObject<boolean>;
}): (() => void) | undefined {
  if (
    graphMode !== '3d'
    || !pendingAutoFitRef.current
    || typeof window === 'undefined'
    || !graphReady
  ) {
    return undefined;
  }

  const timer = window.setTimeout(() => {
    if (!pendingAutoFitRef.current) {
      return;
    }

    pendingAutoFitRef.current = false;
    fitView();
  }, 0);

  return () => {
    window.clearTimeout(timer);
  };
}

export function runAutoFitEngineStop({
  fitView,
  handleEngineStop,
  pendingAutoFitRef,
}: {
  fitView(this: void): void;
  handleEngineStop(this: void): void;
  pendingAutoFitRef: MutableRefObject<boolean>;
}): void {
  if (pendingAutoFitRef.current) {
    pendingAutoFitRef.current = false;
    fitView();
  }

  handleEngineStop();
}

export function useGraphAutoFit({
  fitView,
  graphData,
  graphMode,
  graphReady,
  handleEngineStop,
}: {
  fitView(this: void): void;
  graphData: object;
  graphMode: '2d' | '3d';
  graphReady: boolean;
  handleEngineStop(this: void): void;
}): () => void {
  const pendingAutoFitRef = useRef(true);

  useEffect(() => {
    resetPendingAutoFit(pendingAutoFitRef);
  }, [graphData, graphMode]);

  useEffect(() => {
    return schedulePending3dAutoFit({
      fitView,
      graphReady,
      graphMode,
      pendingAutoFitRef,
    });
  }, [fitView, graphData, graphMode, graphReady]);

  return useCallback(() => {
    runAutoFitEngineStop({
      fitView,
      handleEngineStop,
      pendingAutoFitRef,
    });
  }, [fitView, handleEngineStop]);
}
