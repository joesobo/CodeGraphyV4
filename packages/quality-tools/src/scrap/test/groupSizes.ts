import { type ScrapExampleMetric } from '../types';

type FingerprintSelector = (example: ScrapExampleMetric) => string | undefined;

function selectedFingerprint(
  example: ScrapExampleMetric,
  selector: FingerprintSelector
): string | undefined {
  return selector(example);
}

export function countedFingerprintGroups(
  examples: ScrapExampleMetric[],
  selector: FingerprintSelector
): number[] {
  const counts = new Map<string, number>();

  examples.forEach((example) => {
    const fingerprint = selectedFingerprint(example, selector);
    if (fingerprint) {
      counts.set(fingerprint, (counts.get(fingerprint) ?? 0) + 1);
    }
  });

  return examples.map((example) => {
    const fingerprint = selectedFingerprint(example, selector);
    return fingerprint ? (counts.get(fingerprint) ?? 0) : 0;
  });
}

export function duplicateGroupCount(groupSizes: number[]): number {
  return groupSizes.filter((groupSize) => groupSize > 1).length;
}
