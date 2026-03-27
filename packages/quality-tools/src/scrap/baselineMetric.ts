import { type ScrapComparison, type ScrapFileMetric } from './scrapTypes';
import { verdictFromDeltas } from './comparisonVerdict';

export interface BaselineFileMetric {
  averageScore?: number;
  coverageMatrixCandidateCount?: number;
  extractionPressureScore?: number;
  filePath?: string;
  harmfulDuplicationScore?: number;
  helperHiddenExampleCount?: number;
  maxScore?: number;
}

interface ComparisonNumbers {
  averageScore: number;
  coverageMatrixCandidateCount: number;
  extractionPressureScore: number;
  harmfulDuplicationScore: number;
  helperHiddenExampleCount: number;
  maxScore: number;
}

function roundedDelta(current: number, previous: number): number {
  return Math.round((current - previous) * 100) / 100;
}

function metricNumbers(metric: ScrapFileMetric): ComparisonNumbers {
  return {
    averageScore: metric.averageScore,
    coverageMatrixCandidateCount: metric.coverageMatrixCandidateCount ?? 0,
    extractionPressureScore: metric.extractionPressureScore ?? 0,
    harmfulDuplicationScore: metric.harmfulDuplicationScore ?? 0,
    helperHiddenExampleCount: metric.helperHiddenExampleCount,
    maxScore: metric.maxScore
  };
}

function baselineNumbers(metric: BaselineFileMetric): ComparisonNumbers {
  return {
    averageScore: metric.averageScore ?? 0,
    coverageMatrixCandidateCount: metric.coverageMatrixCandidateCount ?? 0,
    extractionPressureScore: metric.extractionPressureScore ?? 0,
    harmfulDuplicationScore: metric.harmfulDuplicationScore ?? 0,
    helperHiddenExampleCount: metric.helperHiddenExampleCount ?? 0,
    maxScore: metric.maxScore ?? 0
  };
}

function deltaSnapshot(
  current: ComparisonNumbers,
  previous: ComparisonNumbers
): Omit<ScrapComparison, 'verdict'> {
  return {
    averageScoreDelta: roundedDelta(current.averageScore, previous.averageScore),
    coverageMatrixDelta: roundedDelta(
      current.coverageMatrixCandidateCount,
      previous.coverageMatrixCandidateCount
    ),
    extractionPressureDelta: roundedDelta(
      current.extractionPressureScore,
      previous.extractionPressureScore
    ),
    harmfulDuplicationDelta: roundedDelta(
      current.harmfulDuplicationScore,
      previous.harmfulDuplicationScore
    ),
    helperHiddenDelta: roundedDelta(
      current.helperHiddenExampleCount,
      previous.helperHiddenExampleCount
    ),
    maxScoreDelta: roundedDelta(current.maxScore, previous.maxScore)
  };
}

export function comparisonForMetric(
  current: ScrapFileMetric,
  previous: BaselineFileMetric | undefined
): ScrapComparison | undefined {
  if (!previous) {
    return undefined;
  }

  const comparison = deltaSnapshot(metricNumbers(current), baselineNumbers(previous));

  return {
    ...comparison,
    verdict: verdictFromDeltas(comparison)
  };
}
