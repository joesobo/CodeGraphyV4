/**
 * Test helpers for organize tests
 * Consolidates common setup, fixtures, and factory functions
 */

import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildImportGraph } from '../../src/organize/cohesion/importGraph';
import type { OrganizeDirectoryMetric } from '../../src/organize/types';
import type { ImportAdjacency } from '../../src/organize/cohesion/importGraph';
import type { QualityTarget } from '../../src/shared/resolve/target';

// ============================================================================
// Temp Directory Management
// ============================================================================

/**
 * Creates and tracks a temporary directory for cleanup
 */
export function createTempDir(dirs: string[], prefix = 'test-'): string {
  const temp = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(temp);
  return temp;
}

/**
 * Cleanup function for use in afterEach hooks
 */
export function cleanupTempDirs(dirs: string[]): void {
  dirs.forEach((dir) => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
  dirs.length = 0;
}

// ============================================================================
// File and Directory Creation
// ============================================================================

/**
 * Writes a single file to a directory
 */
export function createFile(dir: string, filename: string, content: string): string {
  const path = join(dir, filename);
  writeFileSync(path, content);
  return path;
}

/**
 * Creates multiple files in a directory
 */
export function createFiles(dir: string, files: Record<string, string>): Record<string, string> {
  const created: Record<string, string> = {};
  for (const [filename, content] of Object.entries(files)) {
    created[filename] = createFile(dir, filename, content);
  }
  return created;
}

/**
 * Creates a nested directory structure with files
 */
export function createDirStructure(
  baseDir: string,
  structure: Record<string, string | Record<string, string>>
): void {
  for (const [path, content] of Object.entries(structure)) {
    if (typeof content === 'string') {
      // It's a file
      createFile(baseDir, path, content);
    } else {
      // It's a nested directory
      const dirPath = join(baseDir, path);
      mkdirSync(dirPath, { recursive: true });
      createFiles(dirPath, content);
    }
  }
}

/**
 * Creates directories (without files)
 */
export function createDirs(baseDir: string, dirNames: string[]): string[] {
  return dirNames.map((name) => {
    const path = join(baseDir, name);
    mkdirSync(path, { recursive: true });
    return path;
  });
}

// ============================================================================
// TypeScript Code Fixtures
// ============================================================================

// Common TypeScript snippets to avoid duplication
export const TS_CODE = {
  SIMPLE_EXPORT: 'export const x = 1;',
  SIMPLE_EXPORT_2: 'export const y = 2;',
  SIMPLE_EXPORT_3: 'export const z = 3;',
  EMPTY: '',
  IMPORT_FROM_SIBLING: (name: string) => `import { x } from './${name}';\nexport const y = x;`,
  FUNCTION_HELPER: (name: string) => `export function ${name}() { return 42; }`,
  BIDIRECTIONAL_IMPORT_A: "import { x } from './bar';\nexport const y = x;",
  BIDIRECTIONAL_IMPORT_B: "import { y } from './foo';\nexport const x = 1;",
  PARENT_IMPORT: "import { x } from '../shared/utils';\nexport const y = x;",
  NODE_MODULES_IMPORT: "import { x } from 'typescript';\nimport { y } from '@mylib/utils';\nexport const z = x;",
  EXPORT_FROM_SIBLING: "export { x, y } from './bar';\nexport const z = 1;",
  EXPORT_STAR: "export * from './bar';",
  IMPORT_TYPE: "import type { MyType } from './bar';\nconst x: MyType = {};",
  IMPORT_WITH_EXT: "import { x } from './bar.ts';\nexport const y = x;",
  IMPORT_WITHOUT_EXT: "import { x } from './bar';\nexport const y = x;",
  DEFAULT_IMPORT: "import Button from './Button';\nexport const App = () => <Button />;",
  DEFAULT_EXPORT_FUNC: 'export default function root() { return 42; }',
  TEST_FILE: (importFrom: string) => `import { x } from './${importFrom}';\ndescribe('foo', () => { it('works', () => { expect(x).toBe(1); }); });`,
} as const;

// Barrel file fixtures
export const BARREL_CODE = {
  // Simple re-exports
  PURE_BARREL: `export { foo } from './foo';\nexport { bar } from './bar';`,
  EXPORT_STAR_BARREL: `export * from './foo';\nexport * from './bar';\nexport * from './baz';`,
  MOSTLY_REEXPORTS: `import { helper } from './helper';\nexport { foo } from './foo';\nexport { bar } from './bar';\nexport { baz } from './baz';\nexport { qux } from './qux';`,
  BELOW_THRESHOLD: `import { helper } from './helper';\nimport { util } from './util';\nexport { foo } from './foo';\nexport { bar } from './bar';\nexport { baz } from './baz';`,
  ONLY_IMPORTS: `import { foo } from './foo';\nimport { bar } from './bar';\nimport { baz } from './baz';`,
  WITH_IMPLEMENTATION: `export function helper() {\n  return 42;\n}\nexport { foo } from './foo';\nexport { bar } from './bar';`,
  TYPE_ONLY_EXPORTS: `export type { Foo } from './Foo';\nexport type { Bar } from './Bar';\nexport type { Baz } from './Baz';`,
  MIXED_SYNTAX: `import { x } from './foo';\nimport type { MyType } from './bar';\nexport { z } from './baz';\nexport * from './qux';`,
} as const;

// ============================================================================
// Metric and Type Fixtures
// ============================================================================

/**
 * Creates a partial OrganizeDirectoryMetric with sensible defaults
 */
export function createMetric(overrides: Partial<OrganizeDirectoryMetric> = {}): OrganizeDirectoryMetric {
  return {
    averageRedundancy: 0.2,
    clusters: [],
    depth: 3,
    depthVerdict: 'STABLE' as const,
    directoryPath: '/repo/src',
    fileIssues: [],
    fileFanOut: 5,
    fileFanOutVerdict: 'STABLE' as const,
    folderFanOut: 2,
    folderFanOutVerdict: 'STABLE' as const,
    ...overrides,
  };
}

/**
 * Creates multiple metrics with different directoryPaths
 */
export function createMetrics(
  specs: Array<{ path: string } & Partial<OrganizeDirectoryMetric>>
): OrganizeDirectoryMetric[] {
  return specs.map(({ path, ...overrides }) =>
    createMetric({
      directoryPath: path,
      ...overrides,
    })
  );
}

// ============================================================================
// Import Graph Fixtures
// ============================================================================

/**
 * Creates an ImportAdjacency map from an edge specification
 */
export function createImportGraph(edges: Record<string, string[]>): ImportAdjacency {
  const graph: ImportAdjacency = new Map();
  const allFiles = new Set<string>();

  // Collect all files
  for (const [from, tos] of Object.entries(edges)) {
    allFiles.add(from);
    for (const to of tos) {
      allFiles.add(to);
    }
  }

  // Initialize all files
  for (const file of allFiles) {
    graph.set(file, new Set(edges[file] ?? []));
  }

  return graph;
}

// ============================================================================
// Quality Target Fixtures
// ============================================================================

/**
 * Creates a QualityTarget for testing
 */
export function createTarget(absolutePath: string): QualityTarget {
  return {
    absolutePath,
    kind: 'directory' as const,
    relativePath: '.',
  };
}

// ============================================================================
// Cluster and File Issue Fixtures
// ============================================================================

/**
 * Creates a partial OrganizeCohesionCluster with sensible defaults
 */
export function createCluster(
  overrides: Partial<import('../../src/organize/types').OrganizeCohesionCluster> = {}
): import('../../src/organize/types').OrganizeCohesionCluster {
  return {
    prefix: 'test',
    memberCount: 5,
    members: [],
    suggestedFolder: 'src/test/',
    confidence: 'prefix-only' as const,
    ...overrides,
  };
}

/**
 * Creates multiple clusters with different prefixes
 */
export function createClusters(
  specs: Array<Partial<import('../../src/organize/types').OrganizeCohesionCluster>>
): import('../../src/organize/types').OrganizeCohesionCluster[] {
  return specs.map((spec, idx) =>
    createCluster({
      prefix: spec.prefix ?? `cluster${idx}`,
      ...spec,
    })
  );
}

/**
 * Creates a file issue for testing
 */
export function createFileIssue(
  overrides: Partial<import('../../src/organize/types').OrganizeFileIssue> = {}
): import('../../src/organize/types').OrganizeFileIssue {
  return {
    fileName: 'test.ts',
    kind: 'low-info-banned' as const,
    detail: 'test',
    redundancyScore: undefined,
    ...overrides,
  };
}

// ============================================================================
// Composite Fixtures for Common Test Patterns
// ============================================================================

/**
 * Creates a temporary directory with TypeScript files and builds an import graph
 * Handles temp dir creation, file writing, and graph building in one call
 * fileList optionally specifies which files should be in the graph (including non-existent ones)
 */
export function buildGraphFromFiles(
  files: Record<string, string>,
  tempDirs: string[],
  fileList?: string[]
): Map<string, Set<string>> {
  const dir = createTempDir(tempDirs);
  const fileNames: string[] = fileList ?? [];

  for (const [filename, content] of Object.entries(files)) {
    createFile(dir, filename, content);
    if (!fileList) {
      fileNames.push(filename);
    }
  }

  return buildImportGraph(dir, fileNames);
}

/**
 * Creates a nested file tree structure in a temp directory
 * Keys are relative paths, values are file content (null for directories)
 */
export function createFileTree(
  structure: Record<string, string | null>,
  tempDirs: string[]
): string {
  const dir = createTempDir(tempDirs);

  for (const [path, content] of Object.entries(structure)) {
    if (content === null) {
      // Create directory
      mkdirSync(join(dir, path), { recursive: true });
    } else {
      // Create file with parent directories
      const fullPath = join(dir, path);
      const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/')) || fullPath.substring(0, fullPath.lastIndexOf('\\'));
      mkdirSync(parentDir, { recursive: true });
      writeFileSync(fullPath, content);
    }
  }

  return dir;
}

/**
 * Writes a baseline JSON file and returns its path
 */
export function createBaselineFile(
  metrics: OrganizeDirectoryMetric[],
  tempDirs: string[]
): string {
  const tempDir = createTempDir(tempDirs);
  const baselinePath = join(tempDir, 'baseline.json');
  writeFileSync(baselinePath, JSON.stringify(metrics));
  return baselinePath;
}
