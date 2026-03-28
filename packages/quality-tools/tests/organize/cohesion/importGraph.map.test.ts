import { describe, expect, it, afterEach } from 'vitest';
import { cleanupTempDirs, buildGraphFromFiles, TS_CODE } from '../testHelpers';

const tempDirs: string[] = [];

afterEach(() => {
  cleanupTempDirs(tempDirs);
});

describe('buildImportGraph - map initialization', () => {
  it('initializes all files in the adjacency map even with no imports', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': TS_CODE.SIMPLE_EXPORT,
        'bar.ts': TS_CODE.SIMPLE_EXPORT_2,
        'baz.ts': TS_CODE.SIMPLE_EXPORT_3
      },
      tempDirs
    );

    expect(graph.has('foo.ts')).toBe(true);
    expect(graph.has('bar.ts')).toBe(true);
    expect(graph.has('baz.ts')).toBe(true);
  });

  it('handles files that cannot be read', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.ts': "import { x } from './bar';"
      },
      tempDirs,
      ['foo.ts', 'bar.ts']
    );

    // Should still initialize both files
    expect(graph.has('foo.ts')).toBe(true);
    expect(graph.has('bar.ts')).toBe(true);
  });

  it('handles mixed import syntaxes in the same file', () => {
    const graph = buildGraphFromFiles(
      {
        'main.ts': [
          "import { x } from './foo';",
          "import type { MyType } from './bar';",
          "export { z } from './baz';",
          "export * from './qux';"
        ].join('\n'),
        'foo.ts': TS_CODE.SIMPLE_EXPORT,
        'bar.ts': 'export interface MyType {}',
        'baz.ts': 'export const z = 3;',
        'qux.ts': 'export const q = 4;'
      },
      tempDirs
    );

    expect(graph.get('main.ts')).toEqual(new Set(['foo.ts', 'bar.ts', 'baz.ts', 'qux.ts']));
  });

  it('handles file extensions with test or spec keywords', () => {
    const graph = buildGraphFromFiles(
      {
        'foo.test.ts': TS_CODE.TEST_FILE('bar'),
        'bar.ts': TS_CODE.SIMPLE_EXPORT
      },
      tempDirs
    );

    expect(graph.get('foo.test.ts')).toEqual(new Set(['bar.ts']));
  });

  it('handles conditional that checks if file can be found', () => {
    const graph = buildGraphFromFiles(
      {
        'existing.ts': TS_CODE.SIMPLE_EXPORT,
        'importer.ts': "import { x } from './existing';\nexport const y = x;"
      },
      tempDirs
    );

    // Should resolve because the file exists
    expect(graph.get('importer.ts')).toEqual(new Set(['existing.ts']));
  });

  it('does not resolve if availableFiles map does not contain basename', () => {
    const graph = buildGraphFromFiles(
      {
        'importer.ts': "import { x } from './missing';\nexport const y = x;",
        'other.ts': 'export const z = 1;'
      },
      tempDirs
    );

    // Should not resolve because 'missing' is not in availableFiles
    expect(graph.get('importer.ts')).toEqual(new Set());
  });

  it('correctly maps file basenames for .ts files', () => {
    const graph = buildGraphFromFiles(
      {
        'utility.ts': 'export const utility = () => {}',
        'consumer.ts': "import { utility } from './utility';\nexport const consumer = () => utility();"
      },
      tempDirs
    );

    expect(graph.get('consumer.ts')).toEqual(new Set(['utility.ts']));
  });

  it('correctly maps file basenames for compound extensions', () => {
    const graph = buildGraphFromFiles(
      {
        'module.ts': 'export const func = () => 1;',
        'module.test.ts': "import { func } from './module';\ndescribe('module', () => {});",
        'module.spec.ts': "import { func } from './module';\ndescribe('module', () => {});"
      },
      tempDirs
    );

    // All map to the same basename 'module'
    // Last one in array wins in availableFiles map
    // module.spec.ts is last, so './module' resolves to 'module.spec.ts'
    const moduleTest = graph.get('module.test.ts');
    const moduleSpec = graph.get('module.spec.ts');
    // Both import './module' which resolves to 'module.spec.ts'
    expect(moduleTest).toEqual(new Set(['module.spec.ts']));
    expect(moduleSpec).toEqual(new Set(['module.spec.ts']));
  });

  it('preserves empty set for files with no imports', () => {
    const graph = buildGraphFromFiles(
      {
        'standalone.ts': 'export const standalone = 42;'
      },
      tempDirs
    );

    const standalone = graph.get('standalone.ts');
    expect(standalone).toEqual(new Set());
    expect(standalone?.size).toBe(0);
  });

  it('handles multiple different basenames correctly', () => {
    const graph = buildGraphFromFiles(
      {
        'a.ts': "import { x } from './b';\nimport { y } from './c';",
        'b.ts': 'export const x = 1;',
        'c.ts': 'export const y = 2;'
      },
      tempDirs
    );

    expect(graph.size).toBe(3);
    expect(graph.get('a.ts')).toEqual(new Set(['b.ts', 'c.ts']));
    expect(graph.get('b.ts')).toEqual(new Set());
    expect(graph.get('c.ts')).toEqual(new Set());
  });

  it('handles adjacency map with many files', () => {
    const files: Record<string, string> = {
      'main.ts': [
        "import { f1 } from './file1';",
        "import { f2 } from './file2';",
        "import { f3 } from './file3';",
        "import { f4 } from './file4';"
      ].join('\n')
    };

    for (let i = 1; i <= 4; i++) {
      files[`file${i}.ts`] = `export const f${i} = ${i};`;
    }

    const graph = buildGraphFromFiles(files, tempDirs);

    expect(graph.size).toBe(5);
    expect(graph.get('main.ts')).toEqual(new Set(['file1.ts', 'file2.ts', 'file3.ts', 'file4.ts']));
  });

  it('creates separate entries for each file in adjacency map', () => {
    const graph = buildGraphFromFiles(
      {
        'file1.ts': TS_CODE.SIMPLE_EXPORT,
        'file2.ts': TS_CODE.SIMPLE_EXPORT_2,
        'file3.ts': TS_CODE.SIMPLE_EXPORT_3
      },
      tempDirs
    );

    expect(graph.has('file1.ts')).toBe(true);
    expect(graph.has('file2.ts')).toBe(true);
    expect(graph.has('file3.ts')).toBe(true);
    expect(Array.from(graph.keys())).toHaveLength(3);
  });

  it('handles adding imports only to existing files in adjacency map', () => {
    const graph = buildGraphFromFiles(
      {
        'exists.ts': "import { x } from './also-exists';\nexport const y = x;",
        'also-exists.ts': TS_CODE.SIMPLE_EXPORT
      },
      tempDirs
    );

    // Both files should be initialized
    expect(graph.has('exists.ts')).toBe(true);
    expect(graph.has('also-exists.ts')).toBe(true);

    // Import is recorded
    expect(graph.get('exists.ts')).toEqual(new Set(['also-exists.ts']));
  });
});
