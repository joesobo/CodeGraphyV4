import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { getFunctionName } from '../../src/crap/getFunctionName';
import { isTrackedFunctionNode } from '../../src/crap/trackedFunctionNodes';

function trackedNodes(source: string): ts.Node[] {
  const sourceFile = ts.createSourceFile('sample.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const nodes: ts.Node[] = [];

  function walk(node: ts.Node): void {
    if (isTrackedFunctionNode(node)) {
      nodes.push(node);
    }
    ts.forEachChild(node, walk);
  }

  walk(sourceFile);
  return nodes;
}

describe('getFunctionName', () => {
  it('derives names for declarations, accessors, constructors, and variable functions', () => {
    const names = trackedNodes(`
      function declared() {}
      const arrow = () => {};
      class Example {
        constructor() {}
        get value() { return 1; }
        set value(next) {}
        method() {}
        field = () => {};
      }
      const objectLiteral = { member: function () { return 1; } };
    `).map(getFunctionName);

    expect(names).toEqual([
      'declared',
      'arrow',
      'constructor',
      'get value',
      'set value',
      'method',
      'field',
      'member'
    ]);
  });

  it('falls back to anonymous names when no declaration name exists', () => {
    const [anonymous] = trackedNodes(`export default function () {};`);
    expect(getFunctionName(anonymous!)).toBe('(anonymous)');
  });

  it('falls back to anonymous for computed or unnamed parents', () => {
    const names = trackedNodes(`
      const objectLiteral = { ['value']: function () { return 1; } };
      [1].map(() => 1);
    `).map(getFunctionName);

    expect(names).toEqual(['(anonymous)', '(anonymous)']);
  });
});
