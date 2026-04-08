export interface NavigatorLike {
  platform?: string;
}

export function detectMacPlatform(
  navigatorLike: NavigatorLike | undefined,
): boolean {
  return typeof navigatorLike?.platform === 'string'
    && /Mac|iPhone|iPad|iPod/.test(navigatorLike.platform);
}
