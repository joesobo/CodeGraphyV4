import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it, afterEach } from 'vitest';
import { buildImportGraph } from '../../../src/organize/cohesion/importGraph';

let tempDirs: string[] = [];

function createTempDir(): string {
  const temp = mkdtempSync(join(tmpdir(), 'import-graph-'));
  tempDirs.push(temp);
  return temp;
}

afterEach(() => {
  tempDirs = [];
});

describe('buildImportGraph', () => {
  it('returns empty adjacency for files with no imports', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'foo.ts'), 'export const x = 1;');
    writeFileSync(join(dir, 'bar.ts'), 'export const y = 2;');

    const graph = buildImportGraph(dir, ['foo.ts', 'bar.ts']);

    expect(graph.get('foo.ts')).toEqual(new Set());
    expect(graph.get('bar.ts')).toEqual(new Set());
  });

  it('records an edge when a file imports a sibling', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'foo.ts'), "import { x } from './bar';\nexport const y = x;");
    writeFileSync(join(dir, 'bar.ts'), 'export const x = 1;');

    const graph = buildImportGraph(dir, ['foo.ts', 'bar.ts']);

    expect(graph.get('foo.ts')).toEqual(new Set(['bar.ts']));
    expect(graph.get('bar.ts')).toEqual(new Set());
  });

  it('handles bidirectional imports', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'foo.ts'), "import { x } from './bar';\nexport const y = x;");
    writeFileSync(join(dir, 'bar.ts'), "import { y } from './foo';\nexport const x = 1;");

    const graph = buildImportGraph(dir, ['foo.ts', 'bar.ts']);

    expect(graph.get('foo.ts')).toEqual(new Set(['bar.ts']));
    expect(graph.get('bar.ts')).toEqual(new Set(['foo.ts']));
  });

  it('ignores imports from parent directories', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'foo.ts'), "import { x } from '../shared/utils';\nexport const y = x;");
    writeFileSync(join(dir, 'bar.ts'), 'export const x = 1;');

    const graph = buildImportGraph(dir, ['foo.ts', 'bar.ts']);

    expect(graph.get('foo.ts')).toEqual(new Set());
    expect(graph.get('bar.ts')).toEqual(new Set());
  });

  it('ignores imports from node_modules', () => {
    const dir = createTempDir();
    writeFileSync(
      join(dir, 'foo.ts'),
      "import { x } from 'typescript';\nimport { y } from '@mylib/utils';\nexport const z = x;"
    );
    writeFileSync(join(dir, 'bar.ts'), 'export const x = 1;');

    const graph = buildImportGraph(dir, ['foo.ts', 'bar.ts']);

    expect(graph.get('foo.ts')).toEqual(new Set());
  });

  it('handles export declarations with moduleSpecifier', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'foo.ts'), "export { x, y } from './bar';\nexport const z = 1;");
    writeFileSync(join(dir, 'bar.ts'), 'export const x = 1;\nexport const y = 2;');

    const graph = buildImportGraph(dir, ['foo.ts', 'bar.ts']);

    expect(graph.get('foo.ts')).toEqual(new Set(['bar.ts']));
  });

  it('handles export * from declarations', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'foo.ts'), "export * from './bar';");
    writeFileSync(join(dir, 'bar.ts'), 'export const x = 1;');

    const graph = buildImportGraph(dir, ['foo.ts', 'bar.ts']);

    expect(graph.get('foo.ts')).toEqual(new Set(['bar.ts']));
  });

  it('handles import type declarations', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'foo.ts'), "import type { MyType } from './bar';\nconst x: MyType = {};");
    writeFileSync(join(dir, 'bar.ts'), 'export interface MyType {}');

    const graph = buildImportGraph(dir, ['foo.ts', 'bar.ts']);

    expect(graph.get('foo.ts')).toEqual(new Set(['bar.ts']));
  });

  it('resolves imports with .ts extension to actual filenames', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'foo.ts'), "import { x } from './bar.ts';\nexport const y = x;");
    writeFileSync(join(dir, 'bar.ts'), 'export const x = 1;');

    const graph = buildImportGraph(dir, ['foo.ts', 'bar.ts']);

    expect(graph.get('foo.ts')).toEqual(new Set(['bar.ts']));
  });

  it('resolves imports without extension to .ts files', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'foo.ts'), "import { x } from './bar';\nexport const y = x;");
    writeFileSync(join(dir, 'bar.ts'), 'export const x = 1;');

    const graph = buildImportGraph(dir, ['foo.ts', 'bar.ts']);

    expect(graph.get('foo.ts')).toEqual(new Set(['bar.ts']));
  });

  it('resolves imports to .tsx files', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'foo.tsx'), "import { Component } from './bar';\nexport const App = () => <Component />;");
    writeFileSync(join(dir, 'bar.tsx'), 'export const Component = () => <div />;');

    const graph = buildImportGraph(dir, ['foo.tsx', 'bar.tsx']);

    expect(graph.get('foo.tsx')).toEqual(new Set(['bar.tsx']));
  });

  it('resolves imports to .js files', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'foo.js'), "import { x } from './bar';\nexport const y = x;");
    writeFileSync(join(dir, 'bar.js'), 'export const x = 1;');

    const graph = buildImportGraph(dir, ['foo.js', 'bar.js']);

    expect(graph.get('foo.js')).toEqual(new Set(['bar.js']));
  });

  it('handles unresolvable imports gracefully', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'foo.ts'), "import { x } from './nonexistent';\nexport const y = x;");
    writeFileSync(join(dir, 'bar.ts'), 'export const x = 1;');

    const graph = buildImportGraph(dir, ['foo.ts', 'bar.ts']);

    expect(graph.get('foo.ts')).toEqual(new Set());
    expect(graph.get('bar.ts')).toEqual(new Set());
  });

  it('handles empty files', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'foo.ts'), '');
    writeFileSync(join(dir, 'bar.ts'), "import { x } from './foo';\nexport const y = x;");

    const graph = buildImportGraph(dir, ['foo.ts', 'bar.ts']);

    expect(graph.get('foo.ts')).toEqual(new Set());
    expect(graph.get('bar.ts')).toEqual(new Set(['foo.ts']));
  });

  it('handles multiple imports from different siblings', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'main.ts'), "import { x } from './foo';\nimport { y } from './bar';");
    writeFileSync(join(dir, 'foo.ts'), 'export const x = 1;');
    writeFileSync(join(dir, 'bar.ts'), 'export const y = 2;');

    const graph = buildImportGraph(dir, ['main.ts', 'foo.ts', 'bar.ts']);

    expect(graph.get('main.ts')).toEqual(new Set(['foo.ts', 'bar.ts']));
  });

  it('initializes all files in the adjacency map even with no imports', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'foo.ts'), 'export const x = 1;');
    writeFileSync(join(dir, 'bar.ts'), 'export const y = 2;');
    writeFileSync(join(dir, 'baz.ts'), 'export const z = 3;');

    const graph = buildImportGraph(dir, ['foo.ts', 'bar.ts', 'baz.ts']);

    expect(graph.has('foo.ts')).toBe(true);
    expect(graph.has('bar.ts')).toBe(true);
    expect(graph.has('baz.ts')).toBe(true);
  });

  it('handles files that cannot be read', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'foo.ts'), "import { x } from './bar';");
    // Don't create bar.ts

    const graph = buildImportGraph(dir, ['foo.ts', 'bar.ts']);

    // Should still initialize both files
    expect(graph.has('foo.ts')).toBe(true);
    expect(graph.has('bar.ts')).toBe(true);
  });

  it('handles mixed import syntaxes in the same file', () => {
    const dir = createTempDir();
    const content = [
      "import { x } from './foo';",
      "import type { MyType } from './bar';",
      "export { z } from './baz';",
      "export * from './qux';"
    ].join('\n');
    writeFileSync(join(dir, 'main.ts'), content);
    writeFileSync(join(dir, 'foo.ts'), 'export const x = 1;');
    writeFileSync(join(dir, 'bar.ts'), 'export interface MyType {}');
    writeFileSync(join(dir, 'baz.ts'), 'export const z = 3;');
    writeFileSync(join(dir, 'qux.ts'), 'export const q = 4;');

    const graph = buildImportGraph(dir, ['main.ts', 'foo.ts', 'bar.ts', 'baz.ts', 'qux.ts']);

    expect(graph.get('main.ts')).toEqual(new Set(['foo.ts', 'bar.ts', 'baz.ts', 'qux.ts']));
  });

  it('handles file extensions with test or spec keywords', () => {
    const dir = createTempDir();
    writeFileSync(
      join(dir, 'foo.test.ts'),
      "import { x } from './bar';\ndescribe('foo', () => { it('works', () => { expect(x).toBe(1); }); });"
    );
    writeFileSync(join(dir, 'bar.ts'), 'export const x = 1;');

    const graph = buildImportGraph(dir, ['foo.test.ts', 'bar.ts']);

    expect(graph.get('foo.test.ts')).toEqual(new Set(['bar.ts']));
  });

  it('handles jsx/tsx files with default exports', () => {
    const dir = createTempDir();
    writeFileSync(
      join(dir, 'App.tsx'),
      "import Button from './Button';\nexport default () => <Button />;"
    );
    writeFileSync(join(dir, 'Button.tsx'), 'export default () => <button>Click</button>;');

    const graph = buildImportGraph(dir, ['App.tsx', 'Button.tsx']);

    expect(graph.get('App.tsx')).toEqual(new Set(['Button.tsx']));
  });
});
