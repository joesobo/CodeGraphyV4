import * as ts from 'typescript';

export function parseStatements(source: string): ts.Statement[] {
  const sourceFile = ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return [...sourceFile.statements];
}
