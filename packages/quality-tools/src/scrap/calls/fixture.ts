import * as ts from 'typescript';
import { terminalCallName } from '../calls/names';
import { isTempResourceCallName } from '../calls/resources';

function hasFixtureCall(node: ts.Node): boolean {
  let found = false;

  function walk(current: ts.Node): void {
    if (ts.isCallExpression(current)) {
      const callName = terminalCallName(current.expression);
      if (isTempResourceCallName(callName)) {
        found = true;
        return;
      }
    }

    ts.forEachChild(current, walk);
  }

  walk(node);
  return found;
}

export function fixtureStatements(node: ts.Node): ts.Statement[] {
  const statements: ts.Statement[] = [];

  ts.forEachChild(node, (child) => {
    if (ts.isStatement(child) && hasFixtureCall(child)) {
      statements.push(child);
    }
    if (ts.isFunctionLike(child)) {
      statements.push(...fixtureStatements(child));
      return;
    }
    if (ts.isBlock(child)) {
      statements.push(...fixtureStatements(child));
    }
  });

  return statements;
}
