import type { GraphState } from '../state';
import type { SetState } from './types';

export function createScalarActions(set: SetState) {
  return {
    setDirectionMode: (mode: GraphState['directionMode']) => set({ directionMode: mode }),
    setDirectionColor: (color: string) => set({ directionColor: color }),
    setParticleSpeed: (speed: number) => set({ particleSpeed: speed }),
    setParticleSize: (size: number) => set({ particleSize: size }),
    setBidirectionalMode: (mode: GraphState['bidirectionalMode']) => set({ bidirectionalMode: mode }),
    setDepthMode: (depthMode: boolean) => set({ depthMode }),
    setMaxFiles: (max: number) => set({ maxFiles: max }),
    setShowFps: (enabled: boolean) => set({ showFps: enabled }),
    setVerboseDiagnostics: (enabled: boolean) => set({ verboseDiagnostics: enabled }),
  };
}
