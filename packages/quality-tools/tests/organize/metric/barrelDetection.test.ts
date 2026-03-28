import { describe, expect, it } from 'vitest';
import { checkBarrelFile } from '../../../src/organize/metric/barrelDetection';
import { BARREL_CODE, TS_CODE } from '../testHelpers';

describe('checkBarrelFile', () => {
  describe('flags barrel files', () => {
    it.each([
      ['pure barrel', BARREL_CODE.PURE_BARREL],
      ['export-star', BARREL_CODE.EXPORT_STAR_BARREL],
      ['mostly re-exports', BARREL_CODE.MOSTLY_REEXPORTS],
    ])('flags %s', (_, content) => {
      const issue = checkBarrelFile('index.ts', content);
      expect(issue).toBeDefined();
      expect(issue?.kind).toBe('barrel');
    });
  });

  describe('does not flag non-barrel files', () => {
    it.each([
      ['normal file with implementations', 'import { helper } from \'./helper\';\nexport function analyze() {\n  return helper();\n}\nexport { Config } from \'./config\';'],
      ['below 80% threshold', BARREL_CODE.BELOW_THRESHOLD],
      ['only imports', BARREL_CODE.ONLY_IMPORTS],
    ])('does not flag %s', (_, content) => {
      const issue = checkBarrelFile('index.ts', content);
      expect(issue).toBeUndefined();
    });
  });

  it('does not flag empty file', () => {
    const issue = checkBarrelFile('empty.ts', '');
    expect(issue).toBeUndefined();
  });

  it('flags file at exactly 80% re-exports', () => {
    const issue = checkBarrelFile('index.ts', BARREL_CODE.MOSTLY_REEXPORTS);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });

  it('provides correct detail message with counts', () => {
    const issue = checkBarrelFile('index.ts', BARREL_CODE.MOSTLY_REEXPORTS);
    expect(issue?.detail).toContain('4 of 5');
  });

  describe('file extension handling', () => {
    it.each([
      ['unsupported .json', 'index.json', BARREL_CODE.PURE_BARREL, undefined],
      ['.tsx', 'index.tsx', 'export { Component } from \'./Component\';\nexport { hooks } from \'./hooks\';', 'barrel'],
      ['.js', 'index.js', 'export { foo } from \'./foo.js\';\nexport { bar } from \'./bar.js\';', 'barrel'],
      ['.jsx', 'index.jsx', 'export { Button } from \'./Button.jsx\';\nexport { Form } from \'./Form.jsx\';', 'barrel'],
    ])('handles %s files', (_, filename, content, expectedKind) => {
      const issue = checkBarrelFile(filename, content);
      if (expectedKind) {
        expect(issue?.kind).toBe(expectedKind);
      } else {
        expect(issue).toBeUndefined();
      }
    });
  });

  it('counts local re-exports without from clause', () => {
    const content = 'import { foo } from \'./foo\';\nimport { bar } from \'./bar\';\nexport { foo, bar };';
    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeUndefined();
  });

  it('counts only re-exports when module and namespace declarations are present', () => {
    const content = [
      'declare module \'foo\' { export const x: any; }',
      'export namespace Helpers { export const value = 1; }',
      'export { foo } from \'./foo\';',
      'export { bar } from \'./bar\';'
    ].join('\n');

    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });

  it('handles mixed local and remote re-exports', () => {
    const content = 'import { foo } from \'./foo\';\nexport { foo };\nexport { bar } from \'./bar\';\nexport { baz } from \'./baz\';\nexport { qux } from \'./qux\';';
    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });

  it('flags file with only type exports', () => {
    const issue = checkBarrelFile('index.ts', BARREL_CODE.TYPE_ONLY_EXPORTS);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });

  it('handles files with comments and whitespace', () => {
    const issue = checkBarrelFile('index.ts', '// This is a barrel file\nexport { foo } from \'./foo\';\n\n// Another export\nexport { bar } from \'./bar\';');
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });

  it('returns correct fileName in issue', () => {
    const issue = checkBarrelFile('myBarrel.ts', BARREL_CODE.PURE_BARREL);
    expect(issue?.fileName).toBe('myBarrel.ts');
  });

  it('handles file with function definition and re-exports', () => {
    const content = 'export function helper() {\n  return 42;\n}\nexport { foo } from \'./foo\';\nexport { bar } from \'./bar\';\nexport { baz } from \'./baz\';\nexport { qux } from \'./qux\';';
    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });

  it('does not flag file with mostly implementations', () => {
    const content = 'export function helper1() { return 1; }\nexport function helper2() { return 2; }\nexport function helper3() { return 3; }\nexport function helper4() { return 4; }\nexport { foo } from \'./foo\';';
    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeUndefined();
  });

  it('handles export default statement', () => {
    const content = TS_CODE.DEFAULT_EXPORT_FUNC + '\nexport { foo } from \'./foo\';\nexport { bar } from \'./bar\';';
    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeUndefined();
  });

  it('handles namespace exports', () => {
    const content = 'export * as foo from \'./foo\';\nexport * as bar from \'./bar\';\nexport * as baz from \'./baz\';';
    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });

  describe('boundary cases', () => {
    it('tests 80% boundary exactly: 4 of 5 is 80%', () => {
      const issue = checkBarrelFile('index.ts', BARREL_CODE.MOSTLY_REEXPORTS);
      expect(issue).toBeDefined();
      expect(issue?.kind).toBe('barrel');
    });

    it('tests below threshold: 4 of 9 is 44%', () => {
      const content = 'import { h1 } from \'./h1\';\nimport { h2 } from \'./h2\';\nimport { h3 } from \'./h3\';\nimport { h4 } from \'./h4\';\nimport { h5 } from \'./h5\';\nexport { foo } from \'./foo\';\nexport { bar } from \'./bar\';\nexport { baz } from \'./baz\';\nexport { qux } from \'./qux\';';
      const issue = checkBarrelFile('index.ts', content);
      expect(issue).toBeUndefined();
    });

    it('handles file without extension', () => {
      const issue = checkBarrelFile('index', BARREL_CODE.PURE_BARREL);
      expect(issue).toBeUndefined();
    });

    it('counts 100% re-exports', () => {
      const content = 'export { foo } from \'./foo\';\nexport { bar } from \'./bar\';\nexport { baz } from \'./baz\';\nexport { qux } from \'./qux\';\nexport { quux } from \'./quux\';';
      const issue = checkBarrelFile('index.ts', content);
      expect(issue).toBeDefined();
      expect(issue?.kind).toBe('barrel');
    });
  });

  describe('mutation killers for barrelDetection.ts', () => {
    it('kills mutation: lastDot > 0 changed to >=', () => {
      // File with extension at position exactly 0 (file starts with dot) - should return ''
      const issue = checkBarrelFile('.ts', BARREL_CODE.PURE_BARREL);
      expect(issue).toBeUndefined();
    });

    it('kills mutation: checks extension properly when dot is at position 0', () => {
      // Confirms that extension starting at position 0 is not a valid extension
      const issue = checkBarrelFile('.hidden', BARREL_CODE.PURE_BARREL);
      expect(issue).toBeUndefined();
    });

    it('kills mutation: moduleSpecifier check must be true for remote re-exports', () => {
      // Local re-exports without from clause should not be counted as re-exports
      const content = 'import { foo } from \'./foo\';\nimport { bar } from \'./bar\';\nexport { foo, bar };';
      const issue = checkBarrelFile('index.ts', content);
      expect(issue).toBeUndefined();
    });

    it('kills mutation: exportClause AND !moduleSpecifier condition', () => {
      // Local re-exports of imported names should be counted as re-exports
      const content = 'import { foo } from \'./foo\';\nexport { foo };\nexport { bar } from \'./bar\';\nexport { baz } from \'./baz\';\nexport { qux } from \'./qux\';';
      const issue = checkBarrelFile('index.ts', content);
      expect(issue).toBeDefined();
      expect(issue?.kind).toBe('barrel');
    });

    it('kills mutation: skips module declarations correctly', () => {
      // Module declarations should be skipped and not counted as statements
      const content = 'declare module \'@types/node\' { export const foo: any; }\nexport { bar } from \'./bar\';\nexport { baz } from \'./baz\';\nexport { qux } from \'./qux\';\nexport { quux } from \'./quux\';';
      const issue = checkBarrelFile('index.ts', content);
      // 4 re-exports out of 4 counted statements (module declaration not counted) = 100%
      expect(issue).toBeDefined();
      expect(issue?.kind).toBe('barrel');
    });

    it('kills mutation: skips namespace exports correctly', () => {
      // Namespace exports should be skipped and not counted as statements
      const content = 'export namespace Foo { export const x = 1; }\nexport { bar } from \'./bar\';\nexport { baz } from \'./baz\';\nexport { qux } from \'./qux\';\nexport { quux } from \'./quux\';';
      const issue = checkBarrelFile('index.ts', content);
      // 4 re-exports out of 4 counted statements (namespace not counted) = 100%
      expect(issue).toBeDefined();
      expect(issue?.kind).toBe('barrel');
    });

    it('kills mutation: totalStatements === 0 must be checked for early return', () => {
      // Only module declarations and namespace exports - totalStatements is 0
      const content = 'export namespace Foo { export const x = 1; }';
      const issue = checkBarrelFile('index.ts', content);
      expect(issue).toBeUndefined();
    });

    it('kills mutation: ratio >= 0.8 must use >= not >', () => {
      // Exactly 80% should trigger the barrel detection
      const content = 'import { h } from \'./h\';\nexport { foo } from \'./foo\';\nexport { bar } from \'./bar\';\nexport { baz } from \'./baz\';\nexport { qux } from \'./qux\';';
      const issue = checkBarrelFile('index.ts', content);
      // 4 of 5 = 80% exactly
      expect(issue).toBeDefined();
      expect(issue?.kind).toBe('barrel');
    });

    it('kills mutation: catches when re-exports count incorrectly', () => {
      // Should count both export * and explicit exports
      const content = 'export * from \'./foo\';\nexport { bar } from \'./bar\';\nexport { baz } from \'./baz\';\nexport { qux } from \'./qux\';';
      const issue = checkBarrelFile('index.ts', content);
      // 4 re-exports out of 4 statements = 100%
      expect(issue).toBeDefined();
      expect(issue?.kind).toBe('barrel');
    });

    it('kills mutation: detail message must include actual counts', () => {
      const issue = checkBarrelFile('index.ts', BARREL_CODE.MOSTLY_REEXPORTS);
      expect(issue?.detail).toBe('80% of statements are re-exports (4 of 5)');
    });

    it('kills mutation: distinguishes between 79% and 80%', () => {
      // 3 of 4 = 75%, should not flag
      const content = 'import { h } from \'./h\';\nexport { foo } from \'./foo\';\nexport { bar } from \'./bar\';\nexport { baz } from \'./baz\';';
      const issue = checkBarrelFile('index.ts', content);
      expect(issue).toBeUndefined();
    });
  });

  describe('specific mutation survivors from L18-L39', () => {
    it('kills L18 mutation: false return value in isReExportStatement', () => {
      // Verify that non-export declarations correctly return undefined (false case)
      const content = 'const x = 1;\nfunction foo() { return 42; }';
      const issue = checkBarrelFile('index.ts', content);
      expect(issue).toBeUndefined();
    });

    it('kills L29 mutation: && vs || in statement counting logic', () => {
      // The condition should exclude BOTH module declarations AND namespace exports
      // If && becomes ||, the logic breaks and excludes too much or too little
      const content = 'declare module \'foo\' { export const x: any; }\nexport { a } from \'./a\';\nexport { b } from \'./b\';\nexport { c } from \'./c\';\nexport { d } from \'./d\';';
      const issue = checkBarrelFile('index.ts', content);
      // 4 of 4 = 100%, should flag
      expect(issue).toBeDefined();
      expect(issue?.kind).toBe('barrel');
    });

    it('kills L29 mutation: conditional check for isModuleDeclaration', () => {
      // Module declarations must be specifically skipped
      const content = 'declare namespace Foo { const bar: any; }\nexport { x } from \'./x\';\nexport { y } from \'./y\';\nexport { z } from \'./z\';\nexport { w } from \'./w\';';
      const issue = checkBarrelFile('index.ts', content);
      expect(issue).toBeDefined();
    });

    it('kills L39 mutation: totalStatements === 0 early return', () => {
      // Empty file or file with only module/namespace declarations
      const content = 'declare module \'test\' { export type T = any; }';
      const issue = checkBarrelFile('index.ts', content);
      expect(issue).toBeUndefined();
    });

    it('kills L39 mutation: conditional at division point', () => {
      // If the totalStatements === 0 check is removed, division by zero errors
      // This ensures the check prevents that
      expect(() => {
        const result = checkBarrelFile('index.ts', 'declare namespace N { const x = 1; }');
        expect(result).toBeUndefined();
      }).not.toThrow();
    });
  });
});
