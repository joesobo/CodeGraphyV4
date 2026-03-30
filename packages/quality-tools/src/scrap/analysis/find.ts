import * as ts from 'typescript';
import { callInfo, callbackArgument, literalName } from '../calls/names';
import { type ScrapExampleNode } from '../types';

interface DescribeBlock {
  body: ts.ArrowFunction | ts.FunctionExpression;
  name: string;
}

function exampleNode(node: ts.CallExpression, describeDepth: number, blockPath: string[]): ScrapExampleNode | undefined {
  const info = callInfo(node.expression);
  const callback = callbackArgument(node);
  if (!callback || (info.baseName !== 'it' && info.baseName !== 'test')) {
    return undefined;
  }

  return {
    body: callback,
    blockPath,
    describeDepth,
    name: literalName(node.arguments[0] ?? node),
    tableDriven: info.tableDriven
  };
}

function nestedDescribe(node: ts.CallExpression): DescribeBlock | undefined {
  const info = callInfo(node.expression);
  const callback = callbackArgument(node);
  if (!callback || (info.baseName !== 'describe' && info.baseName !== 'context')) {
    return undefined;
  }

  return {
    body: callback,
    name: literalName(node.arguments[0] ?? node)
  };
}

export function findExamples(sourceFile: ts.SourceFile): ScrapExampleNode[] {
  const examples: ScrapExampleNode[] = [];

  function walk(node: ts.Node, describeDepth: number, blockPath: string[]): void {
    if (ts.isCallExpression(node)) {
      const describeBlock = nestedDescribe(node);
      if (describeBlock) {
        walk(describeBlock.body, describeDepth + 1, [...blockPath, describeBlock.name]);
        return;
      }

      const example = exampleNode(node, describeDepth, blockPath);
      if (example) {
        examples.push(example);
      }
    }

    ts.forEachChild(node, (child) => walk(child, describeDepth, blockPath));
  }

  walk(sourceFile, 0, []);
  return examples;
}
