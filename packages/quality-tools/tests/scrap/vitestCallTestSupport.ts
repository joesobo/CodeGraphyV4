import * as ts from 'typescript';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function calls(source: string): ts.CallExpression[] {
  const sourceFile = parse(source);
  const result: ts.CallExpression[] = [];

  function walk(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      result.push(node);
    }

    ts.forEachChild(node, walk);
  }

  walk(sourceFile);
  return result;
}

export function parseVitestCalls(source: string): ts.CallExpression[] {
  return calls(source);
}

export function selectVitestCall(
  source: string,
  predicate: (value: ts.CallExpression) => boolean
): ts.CallExpression {
  const result = calls(source).find(predicate);

  if (!result) {
    throw new Error('Expected call expression');
  }

  return result;
}
