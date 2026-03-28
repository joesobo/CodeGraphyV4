import * as ts from 'typescript';
import { terminalCallName } from './names';

export function hasPropertyName(expression: ts.LeftHandSideExpression, name: string): boolean {
  if (ts.isCallExpression(expression)) {
    return hasPropertyName(expression.expression, name);
  }

  if (!ts.isPropertyAccessExpression(expression)) {
    return false;
  }

  return expression.name.text === name || hasPropertyName(expression.expression, name);
}

export function matchesTerminalName(
  expression: ts.LeftHandSideExpression,
  names: ReadonlySet<string>
): boolean {
  const name = terminalCallName(expression);
  if (name === undefined) {
    return false;
  }

  return names.has(name);
}
