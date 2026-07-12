import type { GraphState } from '../state';
import type { SetState } from './types';

export function createScalarActions(set: SetState) {
  return {
    setDirectionMode: (mode: GraphState['directionMode']) => set({ directionMode: mode }),
    setDirectionColor: (color: string) => set({ directionColor: color }),
    setParticleSpeed: (speed: number) => set({ particleSpeed: speed }),
    setParticleSize: (size: number) => set({ particleSize: size }),
    setPhysicsPaused: (paused: boolean) => set({ physicsPaused: paused }),
    setBidirectionalMode: (mode: GraphState['bidirectionalMode']) => set({ bidirectionalMode: mode }),
    setDepthMode: (depthMode: boolean) => set({ depthMode }),
    setDagMode: (mode: GraphState['dagMode']) => set({ dagMode: mode }),
    setMaxFiles: (max: number) => set({ maxFiles: max }),
    setVerboseDiagnostics: (enabled: boolean) => set({ verboseDiagnostics: enabled }),
  };
}
