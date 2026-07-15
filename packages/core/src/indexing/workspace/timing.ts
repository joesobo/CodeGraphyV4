import { performance } from 'node:perf_hooks';
import { createDiagnosticEvent } from '../../diagnostics/events';
import type { IndexCodeGraphyWorkspaceOptions } from '../contracts';

function emitIndexPhaseCompleted(
  options: IndexCodeGraphyWorkspaceOptions,
  phase: string,
  durationMs: number,
  context: Record<string, unknown> = {},
): void {
  options.diagnostics?.emit(createDiagnosticEvent({
    area: 'indexing',
    event: 'phase-completed',
    context: {
      phase,
      durationMs: Math.round(durationMs),
      ...context,
    },
  }));
}

export async function timeIndexPhase<T>(
  options: IndexCodeGraphyWorkspaceOptions,
  phase: string,
  run: () => Promise<T>,
  createContext: (result: T) => Record<string, unknown> = () => ({}),
): Promise<T> {
  const startedAt = performance.now();
  const result = await run();
  emitIndexPhaseCompleted(options, phase, performance.now() - startedAt, createContext(result));
  return result;
}

export function timeIndexPhaseSync<T>(
  options: IndexCodeGraphyWorkspaceOptions,
  phase: string,
  run: () => T,
  createContext: (result: T) => Record<string, unknown> = () => ({}),
): T {
  const startedAt = performance.now();
  const result = run();
  emitIndexPhaseCompleted(options, phase, performance.now() - startedAt, createContext(result));
  return result;
}
