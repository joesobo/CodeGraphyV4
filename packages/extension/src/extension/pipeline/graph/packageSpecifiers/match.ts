export function isExternalPackageSpecifier(specifier: string): boolean {
  if (specifier.startsWith('node:')) {
    return /^[\w-]/.test(specifier.slice(5));
  }

  if (specifier.includes(':')) {
    return false;
  }

  return /^(?![./#])(?:@[\w-]+\/)?[\w-]/.test(specifier);
}
