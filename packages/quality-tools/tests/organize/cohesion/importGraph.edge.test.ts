import { describe, expect, it, afterEach } from 'vitest';
import { cleanupTempDirs, buildGraphFromFiles, TS_CODE } from '../testHelpers';

const tempDirs: string[] = [];

afterEach(() => cleanupTempDirs(tempDirs));

describe('buildImportGraph - edge cases', () => {
  it('returns empty adjacency for files with no imports', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': TS_CODE.SIMPLE_EXPORT,
        'bar.ts': TS_CODE.SIMPLE_EXPORT_2
      },
      tempDirs
    );

    expect(graph.get('foo.ts')).toEqual(new Set());
    expect(graph.get('bar.ts')).toEqual(new Set());
    expect(graph.size).toBe(2);
  });

  it('records an edge when a file imports a sibling', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': TS_CODE.IMPORT_FROM_SIBLING('bar'),
        'bar.ts': TS_CODE.SIMPLE_EXPORT
      },
      tempDirs
    );

    expect(graph.get('foo.ts')).toEqual(new Set(['bar.ts']));
    expect(graph.get('bar.ts')).toEqual(new Set());
    expect(graph.get('foo.ts')?.size).toBe(1);
  });

  it('handles bidirectional imports', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': TS_CODE.BIDIRECTIONAL_IMPORT_A,
        'bar.ts': TS_CODE.BIDIRECTIONAL_IMPORT_B
      },
      tempDirs
    );

    expect(graph.get('foo.ts')).toEqual(new Set(['bar.ts']));
    expect(graph.get('bar.ts')).toEqual(new Set(['foo.ts']));
    expect(graph.size).toBe(2);
  });

  it('ignores imports from parent directories', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': TS_CODE.PARENT_IMPORT,
        'bar.ts': TS_CODE.SIMPLE_EXPORT
      },
      tempDirs
    );

    expect(graph.get('foo.ts')).toEqual(new Set());
    expect(graph.get('bar.ts')).toEqual(new Set());
    expect(graph.size).toBe(2);
  });

  it('ignores imports from node_modules', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': TS_CODE.NODE_MODULES_IMPORT,
        'bar.ts': TS_CODE.SIMPLE_EXPORT
      },
      tempDirs
    );

    expect(graph.get('foo.ts')).toEqual(new Set());
    expect(graph.get('bar.ts')).toEqual(new Set());
  });

  it('handles export declarations with moduleSpecifier', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': TS_CODE.EXPORT_FROM_SIBLING,
        'bar.ts': 'export const x = 1;\nexport const y = 2;'
      },
      tempDirs
    );

    expect(graph.get('foo.ts')).toEqual(new Set(['bar.ts']));
    expect(graph.get('foo.ts')?.size).toBe(1);
  });

  it('handles export * from declarations', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': TS_CODE.EXPORT_STAR,
        'bar.ts': TS_CODE.SIMPLE_EXPORT
      },
      tempDirs
    );

    expect(graph.get('foo.ts')).toEqual(new Set(['bar.ts']));
    expect(graph.size).toBe(2);
  });

  it('handles import type declarations', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': TS_CODE.IMPORT_TYPE,
        'bar.ts': 'export interface MyType {}'
      },
      tempDirs
    );

    expect(graph.get('foo.ts')).toEqual(new Set(['bar.ts']));
    expect(graph.get('bar.ts')).toEqual(new Set());
  });

  it('handles unresolvable imports gracefully', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': "import { x } from './nonexistent';\nexport const y = x;",
        'bar.ts': TS_CODE.SIMPLE_EXPORT
      },
      tempDirs
    );

    expect(graph.get('foo.ts')).toEqual(new Set());
    expect(graph.get('bar.ts')).toEqual(new Set());
    expect(graph.size).toBe(2);
  });

  it('handles empty files', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': TS_CODE.EMPTY,
        'bar.ts': "import { x } from './foo';\nexport const y = x;"
      },
      tempDirs
    );

    expect(graph.get('foo.ts')).toEqual(new Set());
    expect(graph.get('bar.ts')).toEqual(new Set(['foo.ts']));
    expect(graph.get('bar.ts')?.size).toBe(1);
  });

  it('handles multiple imports from different siblings', () => {
    const graph = buildGraphFromFiles(
      {
        'main.ts': "import { x } from './foo';\nimport { y } from './bar';",
        'foo.ts': TS_CODE.SIMPLE_EXPORT,
        'bar.ts': 'export const y = 2;'
      },
      tempDirs
    );

    expect(graph.get('main.ts')).toEqual(new Set(['foo.ts', 'bar.ts']));
    expect(graph.get('main.ts')?.size).toBe(2);
    expect(graph.size).toBe(3);
  });

  it('handles import statement without module specifier', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': "import x from 'somelib';\nexport const y = x;"
      },
      tempDirs
    );

    expect(graph.get('foo.ts')).toEqual(new Set());
  });

  it('handles export statement without module specifier', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': 'export { x };',
        'bar.ts': TS_CODE.SIMPLE_EXPORT
      },
      tempDirs
    );

    expect(graph.get('foo.ts')).toEqual(new Set());
    expect(graph.get('bar.ts')).toEqual(new Set());
  });

  it('handles complex import with side-effects', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': "import './styles';\nimport { x } from './bar';\nexport const y = x;",
        'bar.ts': TS_CODE.SIMPLE_EXPORT,
        'styles.ts': "console.log('styles');"
      },
      tempDirs
    );

    expect(graph.get('foo.ts')).toEqual(new Set(['bar.ts', 'styles.ts']));
  });

  it('handles export with string literal that is not from a module', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': 'const x = "./not-an-import";\nexport { x };'
      },
      tempDirs
    );

    expect(graph.get('foo.ts')).toEqual(new Set());
  });

  it('handles re-exports with named imports', () => {
    const graph = buildGraphFromFiles(
      {
        'index.ts': "export { Component, hooks } from './component';\nexport { utils } from './utils';",
        'component.ts': 'export const Component = () => {}; export const hooks = {};',
        'utils.ts': 'export const utils = {};'
      },
      tempDirs
    );

    expect(graph.get('index.ts')).toEqual(new Set(['component.ts', 'utils.ts']));
  });

  it('handles files that cannot be parsed due to syntax errors', () => {
    const graph = buildGraphFromFiles(
      {
        'broken.ts': 'import { x } from "./foo"; }{invalid[',
        'foo.ts': TS_CODE.SIMPLE_EXPORT
      },
      tempDirs
    );

    // Even with syntax errors, should still attempt to find imports
    expect(graph.has('broken.ts')).toBe(true);
    expect(graph.has('foo.ts')).toBe(true);
  });

  it('handles import specifier that is not a string literal (computed)', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': "const path = './bar';\nimport(path).then(() => {});\nexport const x = 1;",
        'bar.ts': TS_CODE.SIMPLE_EXPORT
      },
      tempDirs
    );

    // Dynamic imports are not string literals, so they won't be captured
    expect(graph.get('foo.ts')).toEqual(new Set());
  });

  it('handles relative import followed by absolute import', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': "import { x } from './bar';\nimport { y } from 'react';\nexport const z = x;",
        'bar.ts': TS_CODE.SIMPLE_EXPORT
      },
      tempDirs
    );

    // Only relative import to sibling should be recorded
    expect(graph.get('foo.ts')).toEqual(new Set(['bar.ts']));
  });

  it('initializes all files in graph even if they fail to parse', () => {
    const graph = buildGraphFromFiles(
      {
        'valid.ts': TS_CODE.SIMPLE_EXPORT,
        'invalid.ts': '}}{{{invalid'
      },
      tempDirs
    );

    expect(graph.size).toBe(2);
    expect(graph.has('valid.ts')).toBe(true);
    expect(graph.has('invalid.ts')).toBe(true);
  });
});
