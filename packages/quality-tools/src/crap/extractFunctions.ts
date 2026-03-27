import * as ts from 'typescript';
import { computeComplexity } from './computeComplexity';
import { getFunctionName } from './getFunctionName';
import { isTrackedFunctionNode } from './trackedFunctionNodes';

export interface FunctionInfo {
  complexity: number;
  endLine: number;
  file: string;
  line: number;
  name: string;
}

export function extractFunctions(sourceFile: ts.SourceFile): FunctionInfo[] {
  const functions: FunctionInfo[] = [];

  function walk(node: ts.Node): void {
    if (isTrackedFunctionNode(node)) {
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

      functions.push({
        complexity: computeComplexity(node),
        endLine: end.line + 1,
        file: sourceFile.fileName,
        line: start.line + 1,
        name: getFunctionName(node)
      });
    }

    ts.forEachChild(node, walk);
  }

  walk(sourceFile);
  return functions;
}
