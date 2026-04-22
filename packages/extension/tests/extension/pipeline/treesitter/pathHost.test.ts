import { describe, expect, it } from 'vitest';
import {
  treeSitterPathExists,
  treeSitterPathIsDirectory,
  treeSitterPathIsFile,
  treeSitterReadDirectory,
  treeSitterReadTextFile,
  withTreeSitterPathHost,
  type TreeSitterPathHost,
} from '../../../../src/extension/pipeline/plugins/treesitter/runtime/pathHost';

function createPathHost(): TreeSitterPathHost {
  return {
    exists: (absolutePath) => absolutePath === '/virtual/workspace/src' || absolutePath === '/virtual/workspace/src/app.ts',
    isDirectory: (absolutePath) => absolutePath === '/virtual/workspace/src',
    isFile: (absolutePath) => absolutePath === '/virtual/workspace/src/app.ts',
    listDirectory: (absolutePath) => absolutePath === '/virtual/workspace/src' ? ['app.ts'] : null,
    readTextFile: (absolutePath) => absolutePath === '/virtual/workspace/src/app.ts' ? 'export {};\n' : null,
  };
}

describe('pipeline/plugins/treesitter/runtime/pathHost', () => {
  it('uses the active host instead of the live filesystem', () => {
    const result = withTreeSitterPathHost(createPathHost(), () => {
      return {
        exists: treeSitterPathExists('/virtual/workspace/src'),
        isDirectory: treeSitterPathIsDirectory('/virtual/workspace/src'),
        isFile: treeSitterPathIsFile('/virtual/workspace/src/app.ts'),
        entries: treeSitterReadDirectory('/virtual/workspace/src'),
        text: treeSitterReadTextFile('/virtual/workspace/src/app.ts'),
      };
    });

    expect(result).toEqual({
      exists: true,
      isDirectory: true,
      isFile: true,
      entries: ['app.ts'],
      text: 'export {};\n',
    });
  });

  it('restores the default filesystem behavior outside the host scope', () => {
    withTreeSitterPathHost(createPathHost(), () => {
      expect(treeSitterPathExists('/virtual/workspace/src')).toBe(true);
    });

    expect(treeSitterPathExists('/virtual/workspace/src')).toBe(false);
  });
});
