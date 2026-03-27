import { type ScrapExampleMetric } from './scrapTypes';

export interface ExampleScoreSummary {
  averageScore: number;
  hotExampleCount: number;
  maxScore: number;
  worstExamples: ScrapExampleMetric[];
}

function totalScore(examples: ScrapExampleMetric[]): number {
  return examples.reduce((sum, example) => sum + example.score, 0);
}

export function averageScore(examples: ScrapExampleMetric[]): number {
  if (examples.length === 0) {
    return 0;
  }

  return totalScore(examples) / examples.length;
}

export function maxScore(examples: ScrapExampleMetric[]): number {
  return examples.reduce((max, example) => Math.max(max, example.score), 0);
}

export function hotExampleCount(examples: ScrapExampleMetric[], threshold = 8): number {
  return examples.filter((example) => example.score >= threshold).length;
}

export function worstExamples(examples: ScrapExampleMetric[]): ScrapExampleMetric[] {
  return [...examples]
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

export function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}
