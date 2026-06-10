import { useCallback } from 'react';

export function runAutoFitEngineStop({
  handleEngineStop,
}: {
  handleEngineStop(this: void): void;
}): void {
  handleEngineStop();
}

export function useGraphAutoFit({
  handleEngineStop,
}: {
  handleEngineStop(this: void): void;
}): () => void {
  return useCallback(() => {
    runAutoFitEngineStop({
      handleEngineStop,
    });
  }, [handleEngineStop]);
}
