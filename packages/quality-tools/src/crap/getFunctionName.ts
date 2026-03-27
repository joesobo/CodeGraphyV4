import * as ts from 'typescript';

type NamedParent = ts.VariableDeclaration | ts.PropertyAssignment | ts.PropertyDeclaration;

function identifierText(name: ts.PropertyName | ts.BindingName): string | undefined {
  return ts.isIdentifier(name) ? name.text : undefined;
}

function declarationName(node: ts.Node): string | undefined {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    return node.name ? identifierText(node.name) : undefined;
  }

  return undefined;
}

function accessorName(node: ts.Node): string | undefined {
  if (ts.isGetAccessorDeclaration(node)) {
    const name = identifierText(node.name);
    return name ? `get ${name}` : undefined;
  }

  if (ts.isSetAccessorDeclaration(node)) {
    const name = identifierText(node.name);
    return name ? `set ${name}` : undefined;
  }

  return undefined;
}

function constructorName(node: ts.Node): string | undefined {
  return ts.isConstructorDeclaration(node) ? 'constructor' : undefined;
}

function isNamedParent(node: ts.Node | undefined): node is NamedParent {
  return !!node && (
    ts.isVariableDeclaration(node) ||
    ts.isPropertyAssignment(node) ||
    ts.isPropertyDeclaration(node)
  );
}

function variableLikeFunctionName(node: ts.ArrowFunction | ts.FunctionExpression): string | undefined {
  return isNamedParent(node.parent) ? identifierText(node.parent.name) : undefined;
}

export function getFunctionName(node: ts.Node): string {
  return declarationName(node)
    ?? accessorName(node)
    ?? constructorName(node)
    ?? (ts.isArrowFunction(node) || ts.isFunctionExpression(node) ? variableLikeFunctionName(node) : undefined)
    ?? '(anonymous)';
}
