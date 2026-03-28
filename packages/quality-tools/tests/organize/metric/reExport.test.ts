import { describe, expect, it } from 'vitest';
import * as ts from 'typescript';
import { SUPPORTED_EXTENSIONS, getFileExtension, isReExportStatement } from '../../../src/organize/metric/reExport';

describe('SUPPORTED_EXTENSIONS', () => {
  it('contains TypeScript extensions', () => {
    expect(SUPPORTED_EXTENSIONS.has('.ts')).toBe(true);
    expect(SUPPORTED_EXTENSIONS.has('.tsx')).toBe(true);
  });

  it('contains JavaScript extensions', () => {
    expect(SUPPORTED_EXTENSIONS.has('.js')).toBe(true);
    expect(SUPPORTED_EXTENSIONS.has('.jsx')).toBe(true);
  });

  it('does not contain other extensions', () => {
    expect(SUPPORTED_EXTENSIONS.has('.json')).toBe(false);
    expect(SUPPORTED_EXTENSIONS.has('.md')).toBe(false);
  });

  it('has expected size', () => {
    expect(SUPPORTED_EXTENSIONS.size).toBe(4);
  });
});

describe('getFileExtension', () => {
  it('extracts .ts extension', () => {
    expect(getFileExtension('index.ts')).toBe('.ts');
  });

  it('extracts .tsx extension', () => {
    expect(getFileExtension('Component.tsx')).toBe('.tsx');
  });

  it('extracts .js extension', () => {
    expect(getFileExtension('script.js')).toBe('.js');
  });

  it('extracts .jsx extension', () => {
    expect(getFileExtension('Component.jsx')).toBe('.jsx');
  });

  it('returns empty string for file without extension', () => {
    expect(getFileExtension('Makefile')).toBe('');
  });

  it('returns empty string for dot at position 0', () => {
    expect(getFileExtension('.ts')).toBe('');
    expect(getFileExtension('.hidden')).toBe('');
  });

  it('handles multiple dots correctly', () => {
    expect(getFileExtension('file.test.ts')).toBe('.ts');
    expect(getFileExtension('config.service.ts')).toBe('.ts');
  });

  it('handles dot at end correctly', () => {
    expect(getFileExtension('file.')).toBe('.');
  });
});

describe('isReExportStatement', () => {
  function parseStatement(code: string): ts.Statement {
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
    return sourceFile.statements[0]!;
  }

  it('identifies export * from statement', () => {
    const statement = parseStatement("export * from './module';");
    expect(isReExportStatement(statement)).toBe(true);
  });

  it('identifies export { named } from statement', () => {
    const statement = parseStatement("export { foo, bar } from './module';");
    expect(isReExportStatement(statement)).toBe(true);
  });

  it('identifies local export without from', () => {
    // Note: parseStatement only gets the first statement (import)
    // For this test we need just the export statement
    const code = 'export { foo };';
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
    const exportStatement = sourceFile.statements[0]!;
    expect(isReExportStatement(exportStatement)).toBe(true);
  });

  it('does not identify regular export function as re-export', () => {
    const statement = parseStatement('export function foo() { return 42; }');
    expect(isReExportStatement(statement)).toBe(false);
  });

  it('does not identify export default as re-export', () => {
    const statement = parseStatement('export default function foo() { return 42; }');
    expect(isReExportStatement(statement)).toBe(false);
  });

  it('identifies export * as namespace', () => {
    const statement = parseStatement("export * as foo from './module';");
    expect(isReExportStatement(statement)).toBe(true);
  });

  it('does not identify import statement as re-export', () => {
    const statement = parseStatement("import { foo } from './module';");
    expect(isReExportStatement(statement)).toBe(false);
  });

  it('does not identify variable declaration as re-export', () => {
    const statement = parseStatement('const x = 42;');
    expect(isReExportStatement(statement)).toBe(false);
  });

  it('does not identify empty export declaration as re-export', () => {
    const statement = parseStatement('export {};');
    expect(isReExportStatement(statement)).toBe(false);
  });

  describe('specific mutation survivors from L13-L19', () => {
    it('kills L13 mutation: moduleSpecifier conditional is necessary', () => {
      // export * from '...' or export { named } from '...' should be true
      // Both have moduleSpecifier, so the condition is critical
      const code1 = "export * from './module';";
      const sourceFile1 = ts.createSourceFile('test.ts', code1, ts.ScriptTarget.Latest, true);
      const statement1 = sourceFile1.statements[0]!;
      expect(isReExportStatement(statement1)).toBe(true);

      const code2 = "export { foo } from './module';";
      const sourceFile2 = ts.createSourceFile('test.ts', code2, ts.ScriptTarget.Latest, true);
      const statement2 = sourceFile2.statements[0]!;
      expect(isReExportStatement(statement2)).toBe(true);
    });

    it('kills L19 mutation: exportClause check is necessary without moduleSpecifier', () => {
      // Local re-export: export { foo } without from
      // This has exportClause but NO moduleSpecifier
      const code = 'export { foo };';
      const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
      const statement = sourceFile.statements[0]!;
      expect(isReExportStatement(statement)).toBe(true);
    });

    it('kills L19 mutation: && vs || in exportClause && !moduleSpecifier condition', () => {
      // Must have exportClause AND NOT have moduleSpecifier for local re-exports
      // If && becomes ||, condition breaks
      const code = 'export { foo };';
      const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
      const statement = sourceFile.statements[0]!;
      expect(isReExportStatement(statement)).toBe(true);

      // But regular function export should not match
      const code2 = 'export function foo() {}';
      const sourceFile2 = ts.createSourceFile('test.ts', code2, ts.ScriptTarget.Latest, true);
      const statement2 = sourceFile2.statements[0]!;
      expect(isReExportStatement(statement2)).toBe(false);
    });

    it('kills L19 mutation: condition must check !moduleSpecifier', () => {
      // export { foo } from 'x' should NOT go into the second condition
      // because it has moduleSpecifier (already caught by first condition)
      const code = "export { foo } from './module';";
      const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
      const statement = sourceFile.statements[0]!;
      expect(isReExportStatement(statement)).toBe(true);
    });
  });
});
