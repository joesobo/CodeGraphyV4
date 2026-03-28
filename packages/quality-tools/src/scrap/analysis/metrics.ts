import * as ts from 'typescript';
import { aiActionability } from './actionability';
import { summarizeBlocks } from '../structure/summaries';
import { analyzeCohesionMetrics } from '../metrics/compute';
import { cohesionRecommendations } from '../metrics/recommendations';
import { analyzeFileExamples } from '../analysis/scored';
import { analyzeDuplicationInsights } from '../test/insights';
import { summarizeExampleCounts } from '../example/countSummary';
import { averageScore, hotExampleCount, maxScore, roundScore, worstExamples } from '../example/scoreSummary';
import { summarizeVitestSignals } from '../vitest/signalSummary';
import { remediationMode } from '../policy/remediationMode';
import { duplicateSetupExampleCount } from '../example/calls/duplicates';
import { validateScrapFile } from '../policy/issues';
import { type ScrapFileMetric } from '../types';

export type { ScrapBlockSummary, ScrapExampleMetric, ScrapFileMetric } from '../types';

export function analyzeScrapFile(sourceFile: ts.SourceFile): ScrapFileMetric {
  const examples = analyzeFileExamples(sourceFile);
  const validationIssues = validateScrapFile(sourceFile);
  const duplicationInsights = analyzeDuplicationInsights(examples);
  const cohesion = analyzeCohesionMetrics(examples);
  const blockSummaries = summarizeBlocks(examples);
  const counts = summarizeExampleCounts(examples);
  const vitestSignals = summarizeVitestSignals(examples);
  const exampleCount = examples.length;
  const meanScore = averageScore(examples);
  const maxExampleScore = maxScore(examples);
  const hotExamples = hotExampleCount(examples);
  const metric: ScrapFileMetric = {
    averageScore: roundScore(meanScore),
    averageAssertionSimilarity: roundScore(cohesion.averageAssertionSimilarity),
    averageExampleSimilarity: roundScore(cohesion.averageExampleSimilarity),
    averageFixtureSimilarity: roundScore(cohesion.averageFixtureSimilarity),
    averageSetupSimilarity: roundScore(cohesion.averageSetupSimilarity),
    averageSubjectOverlap: roundScore(cohesion.averageSubjectOverlap),
    assertionShapeDiversity: cohesion.assertionShapeDiversity,
    asyncWaitExampleCount: vitestSignals.asyncWaitExampleCount,
    branchingExampleCount: counts.branchingExampleCount,
    blockSummaries,
    coverageMatrixCandidateCount: duplicationInsights.coverageMatrixCandidateCount,
    concurrencyExampleCount: vitestSignals.concurrencyExampleCount,
    distinctSubjectCount: cohesion.distinctSubjectCount,
    duplicateSetupExampleCount: duplicateSetupExampleCount(counts.duplicateSetupGroupSizes),
    effectiveDuplicationScore: duplicationInsights.effectiveDuplicationScore,
    exampleCount,
    exampleShapeDiversity: cohesion.exampleShapeDiversity,
    extractionPressureScore: duplicationInsights.extractionPressureScore,
    filePath: sourceFile.fileName,
    fakeTimerExampleCount: vitestSignals.fakeTimerExampleCount,
    moduleMockExampleCount: vitestSignals.moduleMockExampleCount,
    harmfulDuplicationScore: duplicationInsights.harmfulDuplicationScore,
    fixtureDuplicationScore: duplicationInsights.fixtureDuplicationScore,
    helperHiddenExampleCount: counts.helperHiddenExampleCount,
    literalDuplicationScore: duplicationInsights.literalDuplicationScore,
    envMutationExampleCount: vitestSignals.envMutationExampleCount,
    lowAssertionExampleCount: counts.lowAssertionExampleCount,
    maxScore: maxExampleScore,
    recommendations: [
      ...duplicationInsights.recommendations,
      ...cohesionRecommendations(cohesion, exampleCount)
    ],
    recommendedExtractionCount: duplicationInsights.recommendedExtractionCount,
    remediationMode: remediationMode(exampleCount, meanScore, hotExamples, maxExampleScore),
    rtlMutationExampleCount: vitestSignals.rtlMutationExampleCount,
    rtlQueryHeavyExampleCount: vitestSignals.rtlQueryHeavyExampleCount,
    rtlRenderExampleCount: vitestSignals.rtlRenderExampleCount,
    snapshotExampleCount: vitestSignals.snapshotExampleCount,
    setupDuplicationScore: duplicationInsights.setupDuplicationScore,
    fixtureShapeDiversity: cohesion.fixtureShapeDiversity,
    setupShapeDiversity: cohesion.setupShapeDiversity,
    subjectRepetitionScore: cohesion.subjectRepetitionScore,
    tableDrivenExampleCount: counts.tableDrivenExampleCount,
    typeOnlyAssertionExampleCount: vitestSignals.typeOnlyAssertionExampleCount,
    tempResourceExampleCount: counts.tempResourceExampleCount,
    validationIssues,
    worstExamples: worstExamples(examples),
    zeroAssertionExampleCount: counts.zeroAssertionExampleCount
  };

  return {
    ...metric,
    aiActionability: aiActionability(metric)
  };
}
