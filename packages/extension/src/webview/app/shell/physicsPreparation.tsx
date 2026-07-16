import React, { useEffect, useState } from 'react';
import { LoadingState } from './states';

type GraphPhysicsPreparationState = { status: 'loading' | 'ready' } | { status: 'error'; message: string };

export function renderGraphStartupState(state: GraphPhysicsPreparationState, isLoading: boolean): React.ReactElement | undefined {
  if (state.status === 'error') return <div role="alert" data-codegraphy-state="wasm-error">Unable to initialize graph physics: {state.message}</div>;
  return isLoading || state.status === 'loading' ? <LoadingState /> : undefined;
}

export function useGraphPhysicsPreparation(preparation: Promise<void> | undefined): GraphPhysicsPreparationState {
  const [state, setState] = useState<GraphPhysicsPreparationState>(() => preparation ? { status: 'loading' } : { status: 'ready' });
  useEffect(() => {
    if (!preparation) { setState({ status: 'ready' }); return; }
    let active = true;
    void preparation.then(
      () => { if (active) setState({ status: 'ready' }); },
      error => { if (active) setState({ status: 'error', message: error instanceof Error ? error.message : String(error) }); },
    );
    return () => { active = false; };
  }, [preparation]);
  return state;
}
