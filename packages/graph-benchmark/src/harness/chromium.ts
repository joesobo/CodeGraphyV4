export function graphBenchmarkChromiumArguments(
  platform: NodeJS.Platform = process.platform,
): string[] {
  return [
    '--enable-unsafe-webgpu',
    ...(platform === 'darwin' ? ['--use-angle=metal'] : []),
  ];
}
