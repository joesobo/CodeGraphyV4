import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { collectHelperDefinitions } from '../../src/scrap/helperDefinitions';

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
});
