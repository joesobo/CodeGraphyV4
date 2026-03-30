import { type QualityTarget } from '../../shared/resolve/target';
import { assertSourceScope } from '../../shared/scope/source';
import { type ResolvedToolPatterns } from '../../config/quality';

function buildScopeIncludes(scope: string, kind: QualityTarget['kind']): string[] {
  if (kind === 'file') {
    return [scope];
  }

  return [`${scope}/**/*.ts`, `${scope}/**/*.tsx`];
}

export function buildMutateGlobs(target: QualityTarget, patterns: ResolvedToolPatterns): string[] {
  if (target.kind === 'package') {
    return [
      ...patterns.include,
      ...patterns.exclude.map((pattern) => `!${pattern}`)
    ];
  }

  const scope = assertSourceScope(target);
  return [
    ...buildScopeIncludes(scope, target.kind),
    ...patterns.exclude.map((pattern) => `!${pattern}`)
  ];
}
