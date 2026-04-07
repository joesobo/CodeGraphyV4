export function getGraphNavigator(): Navigator | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator;
}

export function getGraphWindow(): Window | undefined {
  return typeof window === 'undefined' ? undefined : window;
}
