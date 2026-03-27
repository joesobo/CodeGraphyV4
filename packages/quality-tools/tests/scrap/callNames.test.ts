import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { baseCallName, callbackArgument, callInfo, literalName, terminalCallName } from '../../src/scrap/callNames';

function firstCall(source: string): ts.CallExpression {
  const sourceFile = ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let result: ts.CallExpression | undefined;
  function walk(node: ts.Node): void {
    if (!result && ts.isCallExpression(node)) {
      result = node;
      return;
    }
    ts.forEachChild(node, walk);
  }
  walk(sourceFile);
  if (!result) {
    throw new Error('Expected call expression');
  }
  return result;
}

function outerCall(source: string): ts.CallExpression {
  const sourceFile = ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const statement = sourceFile.statements[0];
  if (!statement || !ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) {
    throw new Error('Expected top-level call expression');
  }
  return statement.expression;
}

describe('callNames', () => {
  it('reads identifiers and property-access call bases', () => {
    expect(callInfo(firstCall(`test('a', () => {})`).expression)).toEqual({
      baseName: 'test',
      tableDriven: false
    });
    expect(baseCallName(firstCall(`test('a', () => {})`).expression)).toBe('test');
    expect(callInfo(firstCall(`describe.only('a', () => {})`).expression)).toEqual({
      baseName: 'describe',
      tableDriven: false
    });
    expect(baseCallName(firstCall(`describe.only('a', () => {})`).expression)).toBe('describe');
    expect(terminalCallName(firstCall(`describe.only('a', () => {})`).expression)).toBe('only');
    expect(terminalCallName(outerCall(`factory()('a')`).expression)).toBe('factory');
  });

  it('detects table-driven calls through chained each wrappers', () => {
    expect(callInfo(firstCall(`test.each([[1]])('a', () => {})`).expression)).toEqual({
      baseName: 'test',
      tableDriven: true
    });
    expect(callInfo(firstCall(`describe.each([[1]]).skip('a', () => {})`).expression)).toEqual({
      baseName: 'describe',
      tableDriven: true
    });
  });

  it('returns undefined for non-property-access expressions even when they expose an expression field', () => {
    expect(callInfo(firstCall(`describe['only']('a', () => {})`).expression)).toEqual({
      baseName: undefined,
      tableDriven: false
    });
    expect(baseCallName(firstCall(`describe['only']('a', () => {})`).expression)).toBeUndefined();
    expect(terminalCallName(firstCall(`describe['only']('a', () => {})`).expression)).toBeUndefined();
  });

  it('returns callback arguments and anonymous names when needed', () => {
    const call = firstCall(`test(value, function () {})`);
    expect(callbackArgument(call)).toBeDefined();
    expect(literalName(call.arguments[0]!)).toBe('(anonymous)');
  });

  it('returns string literal names and undefined when no callback argument exists', () => {
    const call = firstCall(`test('named')`);
    expect(literalName(call.arguments[0]!)).toBe('named');
    expect(callbackArgument(call)).toBeUndefined();
  });
});
