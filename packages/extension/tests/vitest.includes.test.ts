import { afterEach, describe, expect, it } from 'vitest';
import {
  extensionMutationIncludes,
  resolveMutationVitestIncludes,
  workspaceMutationIncludes,
} from '../vitest.includes';

describe('vitest includes', () => {
  afterEach(() => {
    delete process.env.QUALITY_TOOLS_VITEST_SCOPE;
    delete process.env.QUALITY_TOOLS_VITEST_INCLUDE_JSON;
  });

  it('defaults mutation scope to extension tests', () => {
    expect(resolveMutationVitestIncludes({})).toEqual(extensionMutationIncludes);
  });

  it('switches mutation scope to workspace tests when requested', () => {
    expect(resolveMutationVitestIncludes({
      QUALITY_TOOLS_VITEST_SCOPE: 'workspace',
    })).toEqual(workspaceMutationIncludes);
  });

  it('prefers explicit mutation include overrides', () => {
    process.env.QUALITY_TOOLS_VITEST_SCOPE = 'workspace';
    process.env.QUALITY_TOOLS_VITEST_INCLUDE_JSON = JSON.stringify(['packages/plugin-godot/tests/**/*.test.ts']);

    expect(resolveMutationVitestIncludes()).toEqual(['packages/plugin-godot/tests/**/*.test.ts']);
  });
});
