import type { IGraphData } from '../graph/contracts.js';
import { createGlobMatcher } from '../globMatch.js';

type GlobMatcher = ReturnType<typeof createGlobMatcher>;

export interface CompiledFilterPattern {
  matches: GlobMatcher;
  pattern: string;
}

export function compileFilterPatterns(patterns: readonly string[]): CompiledFilterPattern[] {
  return patterns.map(pattern => ({
    matches: createGlobMatcher(pattern),
    pattern,
  }));
}

export function getDirectEdgePatternMatchers(
  patterns: readonly CompiledFilterPattern[],
): GlobMatcher[] {
  return patterns
    .filter(({ pattern }) => canFilterEdgeDirectly(pattern))
    .map(({ matches }) => matches);
}

export function nodeMatchesPattern(node: IGraphData['nodes'][number], matches: GlobMatcher): boolean {
  return matches(node.id)
    || (node.symbol?.filePath ? matches(node.symbol.filePath) : false);
}

export function edgeMatchesPattern(edge: IGraphData['edges'][number], matches: GlobMatcher): boolean {
  return (
    matches(edge.id)
    || matches(edge.kind)
    || matches(`${edge.from}->${edge.to}`)
    || matches(`${edge.from}->${edge.to}#${edge.kind}`)
  );
}

function canFilterEdgeDirectly(pattern: string): boolean {
  return pattern.includes('->')
    || pattern.includes('#')
    || (!pattern.includes('*') && !pattern.includes('/'));
}
