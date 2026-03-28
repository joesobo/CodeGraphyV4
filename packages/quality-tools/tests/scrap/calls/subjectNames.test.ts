import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { collectStatementSubjectNames, collectSubjectNames } from '../../../src/scrap/calls/subjectNames';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function firstBody(source: string): ts.CallExpression {
  const sourceFile = parse(source);
  let callExpression: ts.CallExpression | undefined;
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
      callExpression = node.expression;
    }
  });
  return callExpression!;
}

describe('collectSubjectNames', () => {
  it('collects subject call names and skips test-framework calls', () => {
    const node = firstBody(`
      test('renders parsed output', () => {
        graphService.load();
        renderGraph(node);
        waitFor(() => expect(result).toBeDefined());
      });
    `);

    expect(collectSubjectNames(node)).toEqual(['graphService', 'renderGraph']);
  });

  it('deduplicates repeated subject names', () => {
    const node = firstBody(`
      test('works', () => {
        parser.parse();
        parser.parse();
        parser.validate();
      });
    `);

    expect(collectSubjectNames(node)).toEqual(['parser']);
  });

  it('collects setup-only helper subjects from statements', () => {
    const sourceFile = parse(`
      const repo = createRepo();
      mkdirSync('/tmp/example');
      const result = helper();
    `);

    expect(collectStatementSubjectNames([...sourceFile.statements])).toEqual([
      'createRepo',
      'helper',
      'mkdirSync'
    ]);
  });
});
