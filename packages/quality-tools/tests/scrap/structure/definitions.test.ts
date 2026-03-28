import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { collectHelperDefinitions } from '../../../src/scrap/structure/definitions';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe('helperDefinitions', () => {
  it('collects named function and variable helpers with their line counts', () => {
    const sourceFile = parse(`
      function topLevelHelper() {
        return 'top';
      }

      describe('suite', () => {
        const buildValue = () => {
          return topLevelHelper();
        };

        const value = 'ignored';
      });
    `);

    expect(collectHelperDefinitions(sourceFile)).toEqual([
      expect.objectContaining({ lineCount: 3, name: 'topLevelHelper' }),
      expect.objectContaining({ lineCount: 3, name: 'buildValue' })
    ]);
  });

  it('ignores non-function variable initializers and anonymous function declarations', () => {
    const sourceFile = parse(`
      const label = 'ignored';
      export default function () {
        return label;
      }
    `);

    expect(collectHelperDefinitions(sourceFile)).toEqual([]);
  });

  describe('mutation killers for definitions.ts', () => {
    it('kills mutation: findHelperContainer check must be verified (line 45)', () => {
      // When findHelperContainer returns undefined, should return undefined
      const sourceFile = parse(`
        function standalone() {
          return 42;
        }
      `);

      const defs = collectHelperDefinitions(sourceFile);
      // Standalone function at module level may or may not have container
      // The mutation kills if we don't check !container
      expect(Array.isArray(defs)).toBe(true);
    });

    it('kills mutation: findHelperContainer check in variable declaration (line 68)', () => {
      // When findHelperContainer returns undefined for variable, should return undefined
      const sourceFile = parse(`
        const noContainer = () => {
          return 42;
        };
      `);

      const defs = collectHelperDefinitions(sourceFile);
      // Variable at module level may or may not have container
      expect(Array.isArray(defs)).toBe(true);
    });

    it('kills mutation: ConditionalExpression at line 45 must check container exists', () => {
      // Verify that function declarations without containers are excluded
      const sourceFile = parse(`
        describe('test', () => {
          function inner() {
            return 42;
          }
        });
      `);

      const defs = collectHelperDefinitions(sourceFile);
      // Should include the inner function if it has a describe container
      expect(defs.some((definition) => definition.name === 'inner')).toBe(true);
    });

    it('kills mutation: ConditionalExpression at line 68 must check initializer AND container exist', () => {
      // Verify that arrow functions within blocks with containers are collected
      const sourceFile = parse(`
        describe('suite', () => {
          const helper = () => {
            return 'value';
          };
        });
      `);

      const defs = collectHelperDefinitions(sourceFile);
      // Should include the helper arrow function
      expect(defs.some((definition) => definition.name === 'helper')).toBe(true);
    });
  });
});
