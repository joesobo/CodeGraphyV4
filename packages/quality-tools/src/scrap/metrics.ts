import * as ts from 'typescript';
import { aiActionability } from './actionability';
import { summarizeBlocks } from './blockSummaries';
import { analyzeCohesionMetrics } from './cohesionMetrics';
import { cohesionRecommendations } from './cohesionRecommendations';
import { analyzeFileExamples } from './scoredExamples';
import { analyzeDuplicationInsights } from './duplicationInsights';
import { summarizeExampleCounts } from './exampleCountSummary';
import { averageScore, hotExampleCount, maxScore, roundScore, worstExamples } from './exampleScoreSummary';
import { summarizeVitestSignals } from './vitestSignalSummary';
import { remediationMode } from './remediationMode';
import { duplicateSetupExampleCount } from './setupDuplicates';
import { validateScrapFile } from './validationIssues';
import { type ScrapFileMetric } from './scrapTypes';

export type { ScrapBlockSummary, ScrapExampleMetric, ScrapFileMetric } from './scrapTypes';

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
    harmfulDuplicationScore: duplicationInsights.harmfulDuplicationScore,
    helperHiddenExampleCount: counts.helperHiddenExampleCount,
    envMutationExampleCount: vitestSignals.envMutationExampleCount,
    lowAssertionExampleCount: counts.lowAssertionExampleCount,
    maxScore: maxExampleScore,
    recommendations: [
      ...duplicationInsights.recommendations,
      ...cohesionRecommendations(cohesion, exampleCount)
    ],
    recommendedExtractionCount: duplicationInsights.recommendedExtractionCount,
    remediationMode: remediationMode(exampleCount, meanScore, hotExamples, maxExampleScore),
    snapshotExampleCount: vitestSignals.snapshotExampleCount,
    setupDuplicationScore: duplicationInsights.setupDuplicationScore,
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
