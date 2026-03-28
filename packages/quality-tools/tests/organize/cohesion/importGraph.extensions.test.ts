import { describe, expect, it, afterEach } from 'vitest';
import { cleanupTempDirs, buildGraphFromFiles, TS_CODE } from '../testHelpers';

const tempDirs: string[] = [];

afterEach(() => cleanupTempDirs(tempDirs));

// Common TypeScript code snippets
const COMPONENT_IMPORT = "import { Component } from './bar';\nexport const App = () => <Component />;";
const COMPONENT_EXPORT = 'export const Component = () => <div />;';
const BUTTON_IMPORT_WITH_EXT = "import { Component } from './button.tsx';\nexport const App = () => <Component />;";
const BUTTON_EXPORT = 'export const Component = () => <button />;';
const DEFAULT_BUTTON_IMPORT = "import Button from './button.jsx';\nexport default () => <Button />;";
const DEFAULT_BUTTON_EXPORT = 'export default () => <button />;';
const HELPER_IMPORT = "import { helper } from './helper.js';\nexport const run = () => helper();";
const HELPER_EXPORT = 'export const helper = () => 42;';

describe('buildImportGraph - file extensions', () => {
  it('resolves imports with .ts extension to actual filenames', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': TS_CODE.IMPORT_WITH_EXT,
        'bar.ts': TS_CODE.SIMPLE_EXPORT
      },
      tempDirs
    );

    expect(graph.get('foo.ts')).toEqual(new Set(['bar.ts']));
    expect(graph.get('bar.ts')).toEqual(new Set());
  });

  it('resolves imports without extension to .ts files', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': TS_CODE.IMPORT_WITHOUT_EXT,
        'bar.ts': TS_CODE.SIMPLE_EXPORT
      },
      tempDirs
    );

    expect(graph.get('foo.ts')).toEqual(new Set(['bar.ts']));
    expect(graph.size).toBe(2);
  });

  it('resolves imports to .tsx files', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.tsx': COMPONENT_IMPORT,
        'bar.tsx': COMPONENT_EXPORT
      },
      tempDirs
    );

    expect(graph.get('foo.tsx')).toEqual(new Set(['bar.tsx']));
    expect(graph.get('foo.tsx')?.size).toBe(1);
  });

  it('resolves imports to .js files', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.js': TS_CODE.IMPORT_WITHOUT_EXT,
        'bar.js': TS_CODE.SIMPLE_EXPORT
      },
      tempDirs
    );

    expect(graph.get('foo.js')).toEqual(new Set(['bar.js']));
    expect(graph.get('bar.js')).toEqual(new Set());
  });

  it('distinguishes between .jsx and .js files', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.jsx': TS_CODE.IMPORT_WITHOUT_EXT,
        'bar.js': TS_CODE.SIMPLE_EXPORT
      },
      tempDirs
    );

    expect(graph.get('foo.jsx')).toEqual(new Set(['bar.js']));
    expect(graph.size).toBe(2);
  });

  it('resolves import with .tsx extension to actual file', () => {
    const graph = buildGraphFromFiles(
      {
        'app.tsx': BUTTON_IMPORT_WITH_EXT,
        'button.tsx': BUTTON_EXPORT
      },
      tempDirs
    );

    expect(graph.get('app.tsx')).toEqual(new Set(['button.tsx']));
    expect(graph.get('button.tsx')).toEqual(new Set());
  });

  it('resolves import with .jsx extension to actual file', () => {
    const graph = buildGraphFromFiles(
      {
        'app.jsx': DEFAULT_BUTTON_IMPORT,
        'button.jsx': DEFAULT_BUTTON_EXPORT
      },
      tempDirs
    );

    expect(graph.get('app.jsx')).toEqual(new Set(['button.jsx']));
    expect(graph.get('app.jsx')?.size).toBe(1);
  });

  it('resolves import with .js extension to actual file', () => {
    const graph = buildGraphFromFiles(
      {
        'app.js': HELPER_IMPORT,
        'helper.js': HELPER_EXPORT
      },
      tempDirs
    );

    expect(graph.get('app.js')).toEqual(new Set(['helper.js']));
    expect(graph.size).toBe(2);
  });

  it('handles jsx/tsx files with default exports', () => {
    const graph = buildGraphFromFiles(
      {
        'App.tsx': TS_CODE.DEFAULT_IMPORT,
        'Button.tsx': 'export default () => <button>Click</button>;'
      },
      tempDirs
    );

    expect(graph.get('App.tsx')).toEqual(new Set(['Button.tsx']));
    expect(graph.get('Button.tsx')).toEqual(new Set());
  });

  it('correctly parses .jsx file with JSX syntax', () => {
    const graph = buildGraphFromFiles(
      {
        'component.jsx': "import { Fragment } from 'react';\nexport const MyComponent = () => <Fragment />;",
        'index.js': "import { MyComponent } from './component';\nexport default MyComponent;"
      },
      tempDirs
    );

    expect(graph.get('component.jsx')).toEqual(new Set());
    expect(graph.get('index.js')).toEqual(new Set(['component.jsx']));
  });

  it('correctly parses .js file without JSX syntax', () => {
    const graph = buildGraphFromFiles(
      {
        'utils.js': "export const add = (a, b) => a + b;",
        'math.js': "import { add } from './utils';\nexport const multiply = (a, b) => a + b;"
      },
      tempDirs
    );

    expect(graph.get('utils.js')).toEqual(new Set());
    expect(graph.get('math.js')).toEqual(new Set(['utils.js']));
  });

  it('correctly parses .tsx file with type annotations', () => {
    const graph = buildGraphFromFiles(
      {
        'Component.tsx': "import type { Props } from './types';\nexport const Component: React.FC<Props> = (props) => <div />;",
        'types.ts': 'export interface Props { name: string; }'
      },
      tempDirs
    );

    expect(graph.get('Component.tsx')).toEqual(new Set(['types.ts']));
    expect(graph.get('types.ts')).toEqual(new Set());
  });

  it('handles multiple compound extensions in single file list', () => {
    const graph = buildGraphFromFiles(
      {
        'index.ts': TS_CODE.SIMPLE_EXPORT,
        'index.test.ts': TS_CODE.TEST_FILE('index'),
        'index.spec.ts': "import { x } from './index';\ndescribe('index', () => {});"
      },
      tempDirs
    );

    // All resolve to same basename 'index'
    expect(graph.has('index.ts')).toBe(true);
    expect(graph.has('index.test.ts')).toBe(true);
    expect(graph.has('index.spec.ts')).toBe(true);
  });

  it('resolves import with .spec.tsx extension to actual file', () => {
    const graph = buildGraphFromFiles(
      {
        'button.tsx': 'export const Button = () => <button />;',
        'button.spec.tsx': "import { Button } from './button';\ndescribe('Button', () => {});"
      },
      tempDirs
    );

    // The availableFiles map stores 'button' -> 'button.spec.tsx' (last one wins)
    // So './button' resolves to 'button.spec.tsx'
    expect(graph.get('button.spec.tsx')).toEqual(new Set(['button.spec.tsx']));
  });

  it('resolves import with .test.jsx extension to actual file', () => {
    const graph = buildGraphFromFiles(
      {
        'component.jsx': 'export const Component = () => <div />;',
        'component.test.jsx': "import { Component } from './component';\ndescribe('Component', () => {});"
      },
      tempDirs
    );

    expect(graph.get('component.test.jsx')).toEqual(new Set(['component.jsx']));
  });
});
