import * as ts from 'typescript';
import { collectHelperDefinitions } from './definitions';
import { directHelperCalls, reachableHelpers } from './reachability';
import { type ScrapExampleNode } from '../types';

export interface HelperUsageMetric {
  helperCallCount: number;
  helperHiddenLineCount: number;
}

export function analyzeHelperUsage(
  sourceFile: ts.SourceFile,
  example: ScrapExampleNode
): HelperUsageMetric {
  const helpers = collectHelperDefinitions(sourceFile);
  const directCalls = directHelperCalls(example.body, helpers);
  const hiddenHelpers = reachableHelpers(example.body, helpers, new Set<string>());

  return {
    helperCallCount: directCalls.length,
    helperHiddenLineCount: hiddenHelpers.reduce((total, helper) => total + helper.lineCount, 0)
  };
}
