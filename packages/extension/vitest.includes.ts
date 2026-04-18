export const extensionMutationIncludes = [
  'packages/extension/tests/**/*.test.{ts,tsx}',
];

export const workspaceMutationIncludes = [
  'packages/*/tests/**/*.test.{ts,tsx}',
];

type ScopeEnv = Partial<Pick<NodeJS.ProcessEnv, 'CODEGRAPHY_VITEST_INCLUDE_JSON' | 'CODEGRAPHY_VITEST_SCOPE'>>;

export function resolveMutationVitestIncludes(environment: ScopeEnv = process.env): string[] {
  if (environment.CODEGRAPHY_VITEST_INCLUDE_JSON) {
    return JSON.parse(environment.CODEGRAPHY_VITEST_INCLUDE_JSON) as string[];
  }

  return environment.CODEGRAPHY_VITEST_SCOPE === 'workspace'
    ? workspaceMutationIncludes
    : extensionMutationIncludes;
}
