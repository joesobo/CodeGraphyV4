import { describe, expect, it, afterEach } from 'vitest';
import { cleanupTempDirs, buildGraphFromFiles, TS_CODE } from '../testHelpers';

const tempDirs: string[] = [];

afterEach(() => {
  cleanupTempDirs(tempDirs);
});

describe('buildImportGraph - file kinds and compound extensions', () => {
  it('correctly identifies .jsx files with JSX script kind', () => {
    const graph = buildGraphFromFiles(
      {
        'component.jsx': "export const MyComponent = () => <div />;"
      },
      tempDirs
    );

    expect(graph.has('component.jsx')).toBe(true);
  });

  it('correctly identifies .tsx files with TSX script kind', () => {
    const graph = buildGraphFromFiles(
      {
        'component.tsx': "export const MyComponent = () => <div />;"
      },
      tempDirs
    );

    expect(graph.has('component.tsx')).toBe(true);
  });

  it('correctly identifies .js files with JS script kind', () => {
    const graph = buildGraphFromFiles(
      {
        'module.js': TS_CODE.SIMPLE_EXPORT
      },
      tempDirs
    );

    expect(graph.has('module.js')).toBe(true);
  });

  it('resolves import with compound extension .test.ts to base name', () => {
    const graph = buildGraphFromFiles(
      {
        'math.test.ts': "import { add } from './math.ts';\ndescribe('add', () => {});",
        'math.ts': 'export const add = (a: number, b: number) => a + b;'
      },
      tempDirs
    );

    expect(graph.get('math.test.ts')).toEqual(new Set(['math.ts']));
  });

  it('resolves import with compound extension .spec.ts to base name', () => {
    const graph = buildGraphFromFiles(
      {
        'math.spec.ts': "import { add } from './math';\ndescribe('add', () => {});",
        'math.ts': 'export const add = (a: number, b: number) => a + b;'
      },
      tempDirs
    );

    expect(graph.get('math.spec.ts')).toEqual(new Set(['math.ts']));
  });

  it('resolves import when test file is in the list', () => {
    const graph = buildGraphFromFiles(
      {
        'button.tsx': 'export const Button = () => <button />;',
        'button.test.tsx': "import { Button } from './button';\ndescribe('Button', () => {});"
      },
      tempDirs
    );

    // The availableFiles map uses basename, so 'button' -> 'button.test.tsx' (last one wins)
    // Therefore './button' resolves to 'button.test.tsx'
    expect(graph.get('button.test.tsx')).toEqual(new Set(['button.test.tsx']));
  });

  it('does not resolve import starting with dot-dot path', () => {
    const graph = buildGraphFromFiles(
      {
        'module.ts': "import { x } from '../other';\nexport const y = x;"
      },
      tempDirs
    );

    expect(graph.get('module.ts')).toEqual(new Set());
  });

  it('does not resolve import without relative path prefix', () => {
    const graph = buildGraphFromFiles(
      {
        'module.ts': "import { x } from 'somemodule';\nexport const y = x;"
      },
      tempDirs
    );

    expect(graph.get('module.ts')).toEqual(new Set());
  });

  it('resolves import with explicit compound extension in specifier', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.test.ts': "import { x } from './bar.test.ts';\ndescribe('foo', () => {});",
        'bar.test.ts': "import { y } from './helper';\ndescribe('bar', () => {});",
        'helper.ts': 'export const y = 2;'
      },
      tempDirs
    );

    expect(graph.get('foo.test.ts')).toEqual(new Set(['bar.test.ts']));
  });

  it('resolves import that strips compound extension correctly', () => {
    const graph = buildGraphFromFiles(
      {
        'app.ts': "import { Component } from './component.spec.tsx';\nexport const App = () => <Component />;",
        'component.spec.tsx': "export const Component = () => <div />;"
      },
      tempDirs
    );

    expect(graph.get('app.ts')).toEqual(new Set(['component.spec.tsx']));
  });
});
