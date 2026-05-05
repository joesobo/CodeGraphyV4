import type { GraphContextEffect } from './effects';

export function createOpenFileEffects(paths: readonly string[]): GraphContextEffect[] {
  return paths.map((path) => ({ kind: 'openFile', path }));
}

export function createFocusEffects(nodeId: string | undefined): GraphContextEffect[] {
  return nodeId ? [{ kind: 'focusNode', nodeId }] : [];
}

export function createPatternPromptEffects(patterns: readonly string[]): GraphContextEffect[] {
  return patterns.length > 0 ? [{ kind: 'promptFilterPattern', patterns: [...patterns] }] : [];
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
