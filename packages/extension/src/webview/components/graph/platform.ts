export interface NavigatorLike {
  platform?: string;
}

export function detectMacPlatform(
  navigatorLike: NavigatorLike | undefined,
): boolean {
  return /Mac|iPhone|iPad|iPod/.test(navigatorLike?.platform ?? '');
}
