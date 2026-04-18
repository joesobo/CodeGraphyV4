import type { GraphContextEffect } from './effects';

export function createOpenFileEffects(paths: string[]): GraphContextEffect[] {
  return paths.map((path) => ({ kind: 'openFile', path }));
}

export function createFocusEffects(nodeId: string | undefined): GraphContextEffect[] {
  return nodeId ? [{ kind: 'focusNode', nodeId }] : [];
}

export function createPatternPromptEffects(pattern: string | undefined): GraphContextEffect[] {
  return pattern ? [{ kind: 'promptFilterPattern', pattern }] : [];
}

export function createLegendPromptEffects(
  pattern: string | undefined,
  color: string,
  target: 'node' | 'edge',
): GraphContextEffect[] {
  return pattern ? [{ kind: 'promptLegendRule', pattern, color, target }] : [];
}

export function createFitViewEffects(): GraphContextEffect[] {
  return [{ kind: 'fitView' }];
}
