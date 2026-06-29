export function isSafeGraphViewChildPath(input: string): boolean {
  const value = input.trim();
  if (
    !value
    || value.startsWith('/')
    || value.includes('\\')
    || hasControlCharacter(value)
    || /^[A-Za-z]:($|\/)/.test(value)
  ) {
    return false;
  }

  return value.split('/').every(isSafePathSegment);
}

export function isSafeGraphViewBasename(input: string): boolean {
  const value = input.trim();
  return isSafePathSegment(value)
    && !value.includes('/')
    && !value.includes('\\')
    && !hasControlCharacter(value);
}

function isSafePathSegment(segment: string): boolean {
  return Boolean(segment) && segment !== '.' && segment !== '..';
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) {
      return true;
    }
  }

  return false;
}
