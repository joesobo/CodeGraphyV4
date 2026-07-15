export function toDartTypeName(specifier: string): string | null {
  const basename = specifier.split('/').pop()?.replace(/\.dart$/, '');
  if (!basename) return null;
  return basename
    .split('_')
    .filter(Boolean)
    .map(part => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join('');
}
