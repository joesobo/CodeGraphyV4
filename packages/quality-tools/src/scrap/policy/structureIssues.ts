import * as ts from 'typescript';
import { baseCallName, callbackArgument } from '../calls/names';
import { isExampleCallName, nextInsideExampleState } from '../example/calls/callKinds';
import { isHookOrStructureCallName } from '../calls/structureCallKinds';
import { type ScrapValidationIssue } from '../types';

function issueLine(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function issue(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  kind: ScrapValidationIssue['kind'],
  message: string
): ScrapValidationIssue {
  return {
    kind,
    line: issueLine(sourceFile, node),
    message
  };
}

function nestedExampleIssue(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  callName: string
): ScrapValidationIssue {
  return issue(
    sourceFile,
    node,
    'nested-test',
    `Nested ${callName} call inside another test body.`
  );
}

function misplacedStructureIssue(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  callName: string
): ScrapValidationIssue {
  return issue(
    sourceFile,
    node,
    'hook-in-test',
    `${callName} call inside a test body should be lifted out of the example.`
  );
}

function issuesForCall(
  sourceFile: ts.SourceFile,
  node: ts.CallExpression,
  insideExample: boolean
): ScrapValidationIssue[] {
  const callName = baseCallName(node.expression);
  if (!insideExample || !callName) {
    return [];
  }

  if (isExampleCallName(callName)) {
    return [nestedExampleIssue(sourceFile, node, callName)];
  }

  if (isHookOrStructureCallName(callName)) {
    return [misplacedStructureIssue(sourceFile, node, callName)];
  }

  return [];
}

function walk(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  insideExample: boolean,
  issues: ScrapValidationIssue[]
): void {
  if (ts.isCallExpression(node)) {
    issues.push(...issuesForCall(sourceFile, node, insideExample));

    const callback = callbackArgument(node);
    if (callback) {
      walk(
        sourceFile,
        callback,
        nextInsideExampleState(insideExample, baseCallName(node.expression)),
        issues
      );
      return;
    }
  }

  ts.forEachChild(node, (child) => walk(sourceFile, child, insideExample, issues));
}

export function structureIssues(sourceFile: ts.SourceFile): ScrapValidationIssue[] {
  const issues: ScrapValidationIssue[] = [];
  walk(sourceFile, sourceFile, false, issues);
  return issues;
}
