import * as ts from 'typescript';
import {
  type HelperDefinition
} from './helperDefinitions';
import { ancestorHelperContainers } from './helperContainers';

function helpersInContainer(
  container: ts.SourceFile | ts.Block,
  helpers: HelperDefinition[]
): HelperDefinition[] {
  return helpers.filter((helper) => helper.container === container);
}

function visibleHelpers(
  scopeNode: ts.FunctionLikeDeclaration,
  helpers: HelperDefinition[]
): Map<string, HelperDefinition> {
  const visible = new Map<string, HelperDefinition>();

  for (const container of ancestorHelperContainers(scopeNode)) {
    for (const helper of helpersInContainer(container, helpers)) {
      if (!visible.has(helper.name)) {
        visible.set(helper.name, helper);
      }
    }
  }

  return visible;
}

export function directHelperCalls(
  scopeNode: ts.FunctionLikeDeclaration,
  helpers: HelperDefinition[]
): HelperDefinition[] {
  const body = scopeNode.body;

  if (!body) {
    return [];
  }

  const calls: HelperDefinition[] = [];
  const visible = visibleHelpers(scopeNode, helpers);

  function visitCall(node: ts.Node): void {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const helper = visible.get(node.expression.text);
      if (helper) {
        calls.push(helper);
      }
    }

    ts.forEachChild(node, visitCall);
  }

  visitCall(body);
  return calls;
}

function appendReachableHelpers(
  helper: HelperDefinition,
  helpers: HelperDefinition[],
  visited: Set<string>,
  reachable: HelperDefinition[]
): void {
  if (visited.has(helper.key)) {
    return;
  }

  visited.add(helper.key);
  reachable.push(helper);

  for (const nestedHelper of directHelperCalls(helper.body, helpers)) {
    appendReachableHelpers(nestedHelper, helpers, visited, reachable);
  }
}

export function reachableHelpers(
  scopeNode: ts.FunctionLikeDeclaration,
  helpers: HelperDefinition[],
  visited: Set<string> = new Set<string>()
): HelperDefinition[] {
  const reachable: HelperDefinition[] = [];

  for (const helper of directHelperCalls(scopeNode, helpers)) {
    appendReachableHelpers(helper, helpers, visited, reachable);
  }

  return reachable;
}
