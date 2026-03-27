import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { countTempResourceWork, maxSetupDepth } from '../../src/scrap/exampleSignals';

function firstStatement(source: string): ts.Statement {
  const sourceFile = ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const statement = sourceFile.statements[0];
  if (!statement) {
    throw new Error('Expected first statement');
  }
  return statement;
}

describe('exampleSignals', () => {
  it('counts nested branch depth in setup code', () => {
    expect(maxSetupDepth(firstStatement(`
      if (ready) {
        while (more) {
          doWork();
        }
      }
    `))).toBe(2);
    expect(maxSetupDepth(firstStatement(`const value = 1;`))).toBe(0);
  });

  it('counts temp-resource work for direct and property-access calls', () => {
    expect(countTempResourceWork(firstStatement(`
      {
        mkdirSync('/tmp/a');
        fs.writeFileSync('/tmp/a.txt', 'data');
        os.tmpdir();
        helper();
      }
    `))).toBe(3);
  });
});
