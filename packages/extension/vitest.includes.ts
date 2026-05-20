export const extensionMutationIncludes = [
  'packages/extension/tests/**/*.test.{ts,tsx}',
];

export const workspaceMutationIncludes = [
  'packages/*/tests/**/*.test.{ts,tsx}',
];

type ScopeEnv = Partial<Pick<NodeJS.ProcessEnv, 'QUALITY_TOOLS_VITEST_INCLUDE_JSON' | 'QUALITY_TOOLS_VITEST_SCOPE'>>;

export function resolveMutationVitestIncludes(environment: ScopeEnv = process.env): string[] {
  if (environment.QUALITY_TOOLS_VITEST_INCLUDE_JSON) {
    return JSON.parse(environment.QUALITY_TOOLS_VITEST_INCLUDE_JSON) as string[];
  }

  return environment.QUALITY_TOOLS_VITEST_SCOPE === 'workspace'
    ? workspaceMutationIncludes
    : extensionMutationIncludes;
}
