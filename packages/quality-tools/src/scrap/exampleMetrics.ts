import * as ts from 'typescript';
import { collectCallCount, countBranches, isAssertionCall, isMockCall } from './exampleCalls';
import {
  allExampleStatements,
  analyzeExampleSetup,
  assertionStatements,
  setupStatements,
  type ExampleSetupMetric
} from './exampleSetup';
import { analyzeVitestSignals, countTempResourceWork, maxSetupDepth } from './exampleSignals';
import { analyzeHelperUsage } from './helperUsage';
import { statementFeatures } from './normalizedShapes';
import { scoreExample } from './scoreExample';
import { statementFingerprint } from './setupFingerprint';
import { collectSubjectNames } from './subjectNames';
import { type ScrapExampleMetric, type ScrapExampleNode } from './scrapTypes';

export function analyzeExample(
  sourceFile: ts.SourceFile,
  example: ScrapExampleNode,
  setupMetric: ExampleSetupMetric = analyzeExampleSetup(sourceFile, example)
): ScrapExampleMetric {
  const start = sourceFile.getLineAndCharacterOfPosition(example.body.getStart());
  const end = sourceFile.getLineAndCharacterOfPosition(example.body.getEnd());
  const helperUsage = analyzeHelperUsage(sourceFile, example);
  const vitestSignals = analyzeVitestSignals(example.body);
  const setupNodes = setupStatements(example);
  const assertionNodes = assertionStatements(example);
  const allNodes = allExampleStatements(example);
  const setupDepth = setupNodes.reduce(
    (maxDepth, statement) => Math.max(maxDepth, maxSetupDepth(statement)),
    0
  );
  const baseMetric = {
    assertionCount: collectCallCount(example.body, isAssertionCall),
    assertionFeatures: statementFeatures(assertionNodes),
    assertionFingerprint: statementFingerprint(assertionNodes),
    blockPath: example.blockPath,
    branchCount: countBranches(example.body),
    describeDepth: example.describeDepth,
    duplicateSetupGroupSize: 0,
    endLine: end.line + 1,
    exampleFeatures: statementFeatures(allNodes),
    exampleFingerprint: statementFingerprint(allNodes),
    asyncWaitCount: vitestSignals.asyncWaitCount,
    concurrencyCount: vitestSignals.concurrencyCount,
    envMutationCount: vitestSignals.envMutationCount,
    helperCallCount: helperUsage.helperCallCount,
    helperHiddenLineCount: helperUsage.helperHiddenLineCount,
    lineCount: end.line - start.line + 1,
    fakeTimerCount: vitestSignals.fakeTimerCount,
    mockCount: collectCallCount(example.body, isMockCall),
    name: example.name,
    snapshotCount: vitestSignals.snapshotCount,
    setupDepth,
    setupFeatures: statementFeatures(setupNodes),
    setupFingerprint: setupMetric.setupFingerprint,
    setupLineCount: setupMetric.setupLineCount,
    startLine: start.line + 1,
    subjectNames: collectSubjectNames(example.body),
    tableDriven: example.tableDriven,
    typeOnlyAssertionCount: vitestSignals.typeOnlyAssertionCount,
    tempResourceCount: countTempResourceWork(example.body)
  };

  return {
    ...baseMetric,
    score: scoreExample(baseMetric)
  };
}
