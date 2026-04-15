import { describe, expect, it } from 'vitest';
import {
  findNearestProjectRoot,
  getPythonSearchRoots,
  getRustCrateRoot,
  resolveGoPackagePath,
  resolveJavaSourceRoot,
  resolveJavaTypePath,
} from '../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots';

describe('pipeline/plugins/treesitter/runtime/projectRoots', () => {
  it('re-exports the project root resolvers', () => {
    expect(findNearestProjectRoot).toBeTypeOf('function');
    expect(getPythonSearchRoots).toBeTypeOf('function');
    expect(getRustCrateRoot).toBeTypeOf('function');
    expect(resolveGoPackagePath).toBeTypeOf('function');
    expect(resolveJavaSourceRoot).toBeTypeOf('function');
    expect(resolveJavaTypePath).toBeTypeOf('function');
  });
});
