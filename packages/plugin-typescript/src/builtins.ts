import { BUILTIN_MODULES } from './builtinModules';

export function isBuiltIn(specifier: string): boolean {
  const base = specifier.startsWith('node:')
    ? specifier.slice(5)
    : specifier;

  return BUILTIN_MODULES.has(base.split('/')[0]);
}

export function isBareSpecifier(specifier: string): boolean {
  return /^(@[\w-]+\/)?[\w-]/.test(specifier);
}
