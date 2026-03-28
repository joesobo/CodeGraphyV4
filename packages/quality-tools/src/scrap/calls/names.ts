import * as ts from 'typescript';

type ExampleCallback = ts.ArrowFunction | ts.FunctionExpression;

export interface CallInfo {
  baseName?: string;
  tableDriven: boolean;
}

export function callInfo(expression: ts.LeftHandSideExpression): CallInfo {
  if (ts.isIdentifier(expression)) {
    return { baseName: expression.text, tableDriven: false };
  }

  if (ts.isPropertyAccessExpression(expression)) {
    const parent = callInfo(expression.expression);
    return {
      baseName: parent.baseName,
      tableDriven: parent.tableDriven || expression.name.text === 'each'
    };
  }

  if (ts.isCallExpression(expression)) {
    return callInfo(expression.expression);
  }

  return { baseName: undefined, tableDriven: false };
}

export function baseCallName(expression: ts.LeftHandSideExpression): string | undefined {
  return callInfo(expression).baseName;
}

export function terminalCallName(expression: ts.LeftHandSideExpression): string | undefined {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }

  if (ts.isCallExpression(expression)) {
    return terminalCallName(expression.expression);
  }

  return undefined;
}

export function literalName(node: ts.Expression): string {
  return ts.isStringLiteralLike(node) ? node.text : '(anonymous)';
}

export function callbackArgument(node: ts.CallExpression): ExampleCallback | undefined {
  return node.arguments.find((argument): argument is ExampleCallback => (
    ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)
  ));
}
