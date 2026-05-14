import { isExternalPackageSpecifier } from './match';

export function getExternalPackageName(specifier: string): string | null {
  if (!isExternalPackageSpecifier(specifier)) {
    return null;
  }

  const normalized = specifier.startsWith('node:')
    ? specifier.slice(5)
    : specifier;

  if (normalized.startsWith('@')) {
    const [scope, name] = normalized.split('/');
    return `${scope}/${name}`;
  }

  const [packageName] = normalized.split('/');
  return packageName ?? null;
}
