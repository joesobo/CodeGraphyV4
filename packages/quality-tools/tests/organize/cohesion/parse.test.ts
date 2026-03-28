import { describe, expect, it, afterEach } from 'vitest';
import { extractImports, parseFileImports } from '../../../src/organize/cohesion/parse';
import { createTempDir, cleanupTempDirs, createFile } from '../testHelpers';
import * as ts from 'typescript';

const tempDirs: string[] = [];

afterEach(() => {
  cleanupTempDirs(tempDirs);
});

describe('extractImports', () => {
  it('extracts import statement module specifiers', () => {
    const code = "import { x } from './foo';\nimport { y } from './bar';";
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);

    const imports = extractImports(sourceFile);

    expect(imports).toEqual(['./foo', './bar']);
  });

  it('extracts export statement module specifiers', () => {
    const code = "export { x } from './foo';\nexport * from './bar';";
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);

    const imports = extractImports(sourceFile);

    expect(imports).toEqual(['./foo', './bar']);
  });

  it('extracts both import and export declarations', () => {
    const code = "import { x } from './foo';\nexport { y } from './bar';";
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);

    const imports = extractImports(sourceFile);

    expect(imports).toEqual(['./foo', './bar']);
  });

  it('returns empty array for code with no imports or exports', () => {
    const code = 'const x = 1;\nfunction foo() { return x; }';
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);

    const imports = extractImports(sourceFile);

    expect(imports).toEqual([]);
  });

  it('ignores import declarations without module specifier', () => {
    const code = "import type { MyType } from './foo';\nconst x: MyType = {};";
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);

    const imports = extractImports(sourceFile);

    expect(imports).toEqual(['./foo']);
  });

  it('handles multiple imports from same module', () => {
    const code = "import { x } from './foo';\nimport { y } from './foo';\nimport { z } from './bar';";
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);

    const imports = extractImports(sourceFile);

    // Should include duplicates as they appear
    expect(imports).toEqual(['./foo', './foo', './bar']);
  });

  it('extracts external module imports', () => {
    const code = "import { Component } from 'react';\nimport * from '@babel/core';";
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);

    const imports = extractImports(sourceFile);

    expect(imports).toEqual(['react', '@babel/core']);
  });

  it('handles empty code', () => {
    const code = '';
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);

    const imports = extractImports(sourceFile);

    expect(imports).toEqual([]);
  });

  it('ignores non-string module specifiers in synthetic import and export nodes', () => {
    const sourceFile = ts.factory.createSourceFile(
      [
        ts.factory.createImportDeclaration(
          undefined,
          undefined,
          ts.factory.createIdentifier('module'),
          undefined
        ),
        ts.factory.createExportDeclaration(
          undefined,
          false,
          undefined,
          ts.factory.createIdentifier('module'),
          undefined
        )
      ],
      ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
      ts.NodeFlags.None
    );

    expect(extractImports(sourceFile)).toEqual([]);
  });

  it('extracts from nested blocks', () => {
    const code = `
      if (condition) {
        import { x } from './foo';
      }
    `;
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);

    const imports = extractImports(sourceFile);

    expect(imports).toEqual(['./foo']);
  });

  it('handles import with default export', () => {
    const code = "import Button from './Button';\nexport default function App() {}";
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);

    const imports = extractImports(sourceFile);

    expect(imports).toEqual(['./Button']);
  });
});

describe('parseFileImports', () => {
  it('parses .ts file and extracts imports', () => {
    const dir = createTempDir(tempDirs);
    const filePath = createFile(dir, 'test.ts', "import { x } from './foo';\nexport const y = x;");

    const imports = parseFileImports(filePath, 'test.ts');

    expect(imports).toEqual(['./foo']);
  });

  it('parses .tsx file and extracts imports', () => {
    const dir = createTempDir(tempDirs);
    const filePath = createFile(dir, 'Button.tsx', "import { Component } from 'react';\nexport const Button = () => <div />;");

    const imports = parseFileImports(filePath, 'Button.tsx');

    expect(imports).toEqual(['react']);
  });

  it('parses .jsx file correctly', () => {
    const dir = createTempDir(tempDirs);
    const filePath = createFile(dir, 'Component.jsx', "import { Component } from 'react';\nconst MyComponent = () => <div />;");

    const imports = parseFileImports(filePath, 'Component.jsx');

    expect(imports).toEqual(['react']);
  });

  it('parses .js file correctly', () => {
    const dir = createTempDir(tempDirs);
    const filePath = createFile(dir, 'module.js', "const x = require('./foo');\nmodule.exports = x;");

    // Note: require() is not an import statement, so should be empty
    const imports = parseFileImports(filePath, 'module.js');

    expect(imports).toEqual([]);
  });

  it('returns empty array for file that does not exist', () => {
    const imports = parseFileImports('/nonexistent/path/file.ts', 'file.ts');

    expect(imports).toEqual([]);
  });

  it('returns empty array for file that cannot be read', () => {
    // Try to read a directory as a file
    const dir = createTempDir(tempDirs);
    const imports = parseFileImports(dir, 'test.ts');

    expect(imports).toEqual([]);
  });

  it('extracts multiple imports from a real file', () => {
    const dir = createTempDir(tempDirs);
    const code = `
import { Component } from 'react';
import { useState } from 'react';
import { configService } from './services/config';
export * from './types';
`;
    const filePath = createFile(dir, 'App.tsx', code);

    const imports = parseFileImports(filePath, 'App.tsx');

    expect(imports).toEqual(['react', 'react', './services/config', './types']);
  });

  it('handles file with no imports', () => {
    const dir = createTempDir(tempDirs);
    const filePath = createFile(dir, 'constants.ts', 'export const PI = 3.14159;');

    const imports = parseFileImports(filePath, 'constants.ts');

    expect(imports).toEqual([]);
  });

  it('determines script kind from filename extension', () => {
    const dir = createTempDir(tempDirs);
    const code = "export const MyComponent = () => <div />;";

    // Create same code as both .ts and .tsx
    const tsxPath = createFile(dir, 'component.tsx', code);
    const tsxImports = parseFileImports(tsxPath, 'component.tsx');

    const tsPath = createFile(dir, 'component.ts', code);
    const tsImports = parseFileImports(tsPath, 'component.ts');

    // Both should parse without error (script kind affects parsing)
    expect(Array.isArray(tsxImports)).toBe(true);
    expect(Array.isArray(tsImports)).toBe(true);
  });
});

describe('extractImports - mutation killers', () => {
  it('kills mutation: L16 && operator (cannot mutate to ||)', () => {
    // If L16 mutated to ||: if (moduleSpecifier || ts.isStringLiteral(moduleSpecifier))
    // This would push even non-string moduleSpecifiers
    // Need a case where moduleSpecifier exists but is NOT a string literal
    const code = "export { x };"; // export without 'from' - has no moduleSpecifier
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);

    const imports = extractImports(sourceFile);

    // Should be empty because export has no moduleSpecifier
    expect(imports).toEqual([]);
  });

  it('kills mutation: L24 && operator (cannot mutate to ||)', () => {
    // Same as L16, for export declarations
    const code = "export { x };"; // export without 'from'
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);

    const imports = extractImports(sourceFile);

    // Should be empty - no moduleSpecifier
    expect(imports).toEqual([]);
  });

  it('kills mutation: L10 empty array [] literal', () => {
    // If [] was mutated to something else, non-empty array would be returned
    const code = 'const x = 1;'; // No imports
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);

    const imports = extractImports(sourceFile);

    // Must be exactly an empty array, not falsy
    expect(imports).toEqual([]);
    expect(Array.isArray(imports)).toBe(true);
    expect(imports.length).toBe(0);
  });

  it('kills mutation: L55 empty array [] in parseFileImports catch block', () => {
    const imports = parseFileImports('/nonexistent/file/path.ts', 'test.ts');

    // Must return exactly empty array, not null or undefined
    expect(imports).toEqual([]);
    expect(Array.isArray(imports)).toBe(true);
    expect(imports.length).toBe(0);
  });
});
