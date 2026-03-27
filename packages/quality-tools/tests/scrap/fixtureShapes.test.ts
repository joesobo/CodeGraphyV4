import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { fixtureStatements } from '../../src/scrap/fixtureShapes';

function parseSource(source: string): ts.SourceFile {
  return ts.createSourceFile(
    'sample.test.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
}

describe('fixtureShapes', () => {
  it('collects statements that contain temp-resource work', () => {
    const statements = fixtureStatements(ts.createSourceFile(
      'sample.test.ts',
      `
        const value = 1;
        mkdirSync('/tmp/a');
        if (ready) {
          fs.writeFileSync('/tmp/b', 'data');
        }
      `,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    ));

    expect(statements).toHaveLength(2);
    expect(statements.map((statement) => statement.getText())).toEqual([
      "mkdirSync('/tmp/a');",
      "if (ready) {\n          fs.writeFileSync('/tmp/b', 'data');\n        }"
    ]);
  });

  it('returns an empty list when no fixture work is present', () => {
    expect(fixtureStatements(parseSource(`
      const value = 1;
      helper();
    `))).toEqual([]);
  });

  it('collects fixture work from nested helper functions and blocks', () => {
    const statements = fixtureStatements(parseSource(`
      function arrangeWorkspace() {
        mkdirSync('/tmp/a');
      }

      if (ready) {
        writeFileSync('/tmp/b', 'data');
      }
    `));

    expect(statements.map((statement) => statement.getText())).toEqual([
      "function arrangeWorkspace() {\n        mkdirSync('/tmp/a');\n      }",
      "mkdirSync('/tmp/a');",
      "if (ready) {\n        writeFileSync('/tmp/b', 'data');\n      }"
    ]);
  });
});
