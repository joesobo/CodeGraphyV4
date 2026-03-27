import * as ts from 'typescript';
import {
  type HelperDefinition
} from './helperDefinitions';
import { ancestorHelperContainers } from './helperContainers';

function visibleHelpers(
  scopeNode: ts.FunctionLikeDeclaration,
  helpers: HelperDefinition[]
): Map<string, HelperDefinition> {
  const visible = new Map<string, HelperDefinition>();

  for (const container of ancestorHelperContainers(scopeNode)) {
    for (const helper of helpers) {
      if (helper.container === container && !visible.has(helper.name)) {
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

export function reachableHelpers(
  scopeNode: ts.FunctionLikeDeclaration,
  helpers: HelperDefinition[],
  visited: Set<string> = new Set<string>()
): HelperDefinition[] {
  const reachable: HelperDefinition[] = [];

  for (const helper of directHelperCalls(scopeNode, helpers)) {
    if (visited.has(helper.key)) {
      continue;
    }

    visited.add(helper.key);
    reachable.push(helper, ...reachableHelpers(helper.body, helpers, visited));
  }

  return reachable;
}
