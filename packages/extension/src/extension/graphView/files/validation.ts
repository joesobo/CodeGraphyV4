export function isSafeGraphViewChildPath(input: string): boolean {
  const value = input.trim();
  if (!value || value.startsWith('/') || value.includes('\\') || /^[A-Za-z]:($|\/)/.test(value)) {
    return false;
  }

  return value.split('/').every(isSafePathSegment);
}

export function isSafeGraphViewBasename(input: string): boolean {
  const value = input.trim();
  return isSafePathSegment(value) && !value.includes('/') && !value.includes('\\');
}

function isSafePathSegment(segment: string): boolean {
  return Boolean(segment) && segment !== '.' && segment !== '..';
}
