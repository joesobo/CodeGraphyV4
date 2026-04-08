export function getGraphNavigator(): Navigator | undefined {
  return globalThis.navigator;
}

export function getGraphWindow(): Window | undefined {
  return globalThis.window;
}
