export function isZoomKey(key: string): boolean {
  switch (key) {
    case ' ':
    case 'Enter':
      return true;
    default:
      return false;
  }
}
