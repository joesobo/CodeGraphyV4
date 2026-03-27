import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { isTrackedFunctionNode } from '../../src/crap/trackedFunctionNodes';

function trackedKinds(source: string): ts.SyntaxKind[] {
  const sourceFile = ts.createSourceFile('sample.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const kinds: ts.SyntaxKind[] = [];

  function walk(node: ts.Node): void {
    if (isTrackedFunctionNode(node)) {
      kinds.push(node.kind);
    }
    ts.forEachChild(node, walk);
  }

  walk(sourceFile);
  return kinds;
}

describe('isTrackedFunctionNode', () => {
  it('tracks supported function-like syntax kinds', () => {
    expect(trackedKinds(`
      function declared() {}
      const arrow = () => {};
      const member = function () {};
      class Example {
        constructor() {}
        get value() { return 1; }
        set value(next) {}
        method() {}
      }
    `)).toEqual([
      ts.SyntaxKind.FunctionDeclaration,
      ts.SyntaxKind.ArrowFunction,
      ts.SyntaxKind.FunctionExpression,
      ts.SyntaxKind.Constructor,
      ts.SyntaxKind.GetAccessor,
      ts.SyntaxKind.SetAccessor,
      ts.SyntaxKind.MethodDeclaration
    ]);
  });

  it('ignores non-function nodes', () => {
    expect(trackedKinds(`
      const value = 1;
      class Example { field = 1; }
      type Alias = string;
    `)).toEqual([]);
  });
});
