import * as ts from 'typescript';
import {
  findHelperContainer,
  type HelperContainer
} from './helperContainers';

export interface HelperDefinition {
  body: ts.FunctionLikeDeclaration;
  container: HelperContainer;
  key: string;
  lineCount: number;
  name: string;
}

function helperLineCount(sourceFile: ts.SourceFile, helper: ts.FunctionLikeDeclaration): number {
  const start = sourceFile.getLineAndCharacterOfPosition(helper.getStart());
  const end = sourceFile.getLineAndCharacterOfPosition(helper.getEnd());
  return end.line - start.line + 1;
}

function createHelperDefinition(
  sourceFile: ts.SourceFile,
  name: string,
  helper: ts.FunctionLikeDeclaration,
  container: HelperContainer
): HelperDefinition {
  return {
    body: helper,
    container,
    key: `${name}:${helper.getStart()}:${helper.getEnd()}`,
    lineCount: helperLineCount(sourceFile, helper),
    name
  };
}

function functionDeclarationDefinition(
  sourceFile: ts.SourceFile,
  node: ts.FunctionDeclaration
): HelperDefinition | undefined {
  if (!node.name || !node.body) {
    return undefined;
  }

  const container = findHelperContainer(node.parent);
  if (!container) {
    return undefined;
  }

  return createHelperDefinition(sourceFile, node.name.text, node, container);
}

function functionInitializer(
  declaration: ts.VariableDeclaration
): ts.FunctionExpression | ts.ArrowFunction | undefined {
  const { initializer } = declaration;

  if (initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) {
    return initializer;
  }

  return undefined;
}

function variableDeclarationDefinition(
  sourceFile: ts.SourceFile,
  node: ts.VariableDeclaration
): HelperDefinition | undefined {
  if (!ts.isIdentifier(node.name)) {
    return undefined;
  }

  const initializer = functionInitializer(node);
  const container = findHelperContainer(node.parent);
  if (!initializer || !container) {
    return undefined;
  }

  return createHelperDefinition(sourceFile, node.name.text, initializer, container);
}

function collectDefinition(sourceFile: ts.SourceFile, node: ts.Node): HelperDefinition | undefined {
  if (ts.isFunctionDeclaration(node)) {
    return functionDeclarationDefinition(sourceFile, node);
  }

  if (ts.isVariableDeclaration(node)) {
    return variableDeclarationDefinition(sourceFile, node);
  }

  return undefined;
}

export function collectHelperDefinitions(sourceFile: ts.SourceFile): HelperDefinition[] {
  const definitions: HelperDefinition[] = [];

  function walk(node: ts.Node): void {
    const definition = collectDefinition(sourceFile, node);
    if (definition) {
      definitions.push(definition);
    }

    ts.forEachChild(node, walk);
  }

  walk(sourceFile);
  return definitions;
}
