export const GRAPH_BENCHMARK_DEVICE_SCALE_FACTOR = 1;
export const GRAPH_BENCHMARK_VIEWPORT = Object.freeze({ height: 720, width: 1280 });

export function graphBenchmarkChromiumArguments(
  platform: NodeJS.Platform = process.platform,
): string[] {
  return [
    '--enable-unsafe-webgpu',
    ...(platform === 'darwin' ? ['--use-angle=metal'] : []),
  ];
}
