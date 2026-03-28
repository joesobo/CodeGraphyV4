import { type ExampleSetupMetric } from '../../example/setup';

function countedFingerprint(setup: ExampleSetupMetric): string | undefined {
  if (!setup.setupFingerprint || setup.setupLineCount < 2) {
    return undefined;
  }

  return setup.setupFingerprint;
}

export function duplicateSetupGroupSizes(setups: ExampleSetupMetric[]): number[] {
  const counts = new Map<string, number>();

  for (const setup of setups) {
    const fingerprint = countedFingerprint(setup);
    if (fingerprint) {
      counts.set(fingerprint, (counts.get(fingerprint) ?? 0) + 1);
    }
  }

  return setups.map((setup) => {
    const fingerprint = countedFingerprint(setup);
    return fingerprint ? (counts.get(fingerprint) ?? 0) : 0;
  });
}

export function duplicateSetupExampleCount(groupSizes: number[]): number {
  return groupSizes.filter((groupSize) => groupSize > 1).length;
}
