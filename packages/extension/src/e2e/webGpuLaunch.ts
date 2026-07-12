export function webGpuCiLaunchArgs({
  ci,
  platform,
}: {
  ci: boolean;
  platform: NodeJS.Platform;
}): string[] {
  if (!ci || platform !== 'linux') {
    return [];
  }

  return [
    '--enable-unsafe-webgpu',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
  ];
}
