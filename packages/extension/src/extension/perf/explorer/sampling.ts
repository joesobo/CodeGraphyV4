const EXPLORER_COMPARISON_SAMPLE_COUNT = 51;
const EXPLORER_COMPARISON_WARMUP_COUNT = 5;
const EXPLORER_REVEAL_SAMPLE_COUNT = 101;

function median(samples: readonly number[]): number {
  return [...samples].sort((left, right) => left - right)[Math.floor(samples.length / 2)];
}

async function sampleMedian(
  measure: () => Promise<number>,
  sampleCount: number,
): Promise<number> {
  const samples: number[] = [];
  for (let index = 0; index < sampleCount; index += 1) {
    samples.push(await measure());
  }

  return median(samples);
}

export function sampleExplorerComparisonMedian(
  measure: () => Promise<number>,
): Promise<number> {
  return (async () => {
    for (let index = 0; index < EXPLORER_COMPARISON_WARMUP_COUNT; index += 1) {
      await measure();
    }
    return sampleMedian(measure, EXPLORER_COMPARISON_SAMPLE_COUNT);
  })();
}

export async function sampleExplorerRevealComparisonMedians(
  measureCodeGraphy: () => Promise<number>,
  measureExplorer: () => Promise<number>,
): Promise<{ codeGraphyRevealMs: number; explorerRevealMs: number }> {
  const codeGraphySamples: number[] = [];
  const explorerSamples: number[] = [];
  for (let index = 0; index < EXPLORER_REVEAL_SAMPLE_COUNT; index += 1) {
    const measurements = index % 2 === 0
      ? [
          async () => { codeGraphySamples.push(await measureCodeGraphy()); },
          async () => { explorerSamples.push(await measureExplorer()); },
        ]
      : [
          async () => { explorerSamples.push(await measureExplorer()); },
          async () => { codeGraphySamples.push(await measureCodeGraphy()); },
        ];
    for (const measure of measurements) await measure();
  }
  return {
    codeGraphyRevealMs: median(codeGraphySamples),
    explorerRevealMs: median(explorerSamples),
  };
}
