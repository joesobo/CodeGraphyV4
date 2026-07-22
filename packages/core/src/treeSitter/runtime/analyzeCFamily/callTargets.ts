import type { ImportedBinding } from '../analyze/model';

export type CallableDeclarationSymbolKind = 'function' | 'prototype';

export interface CFamilyCallDeclarationTarget {
  filePath: string;
  symbolKind: CallableDeclarationSymbolKind;
  symbolId?: string;
}

export interface CFamilyCallDeclarations {
  functionTargetByName: ReadonlyMap<string, CFamilyCallDeclarationTarget | null>;
}

export function setUniqueCallTarget(
  targetsByName: Map<string, CFamilyCallDeclarationTarget | null>,
  name: string,
  target: CFamilyCallDeclarationTarget,
): void {
  if (!targetsByName.has(name)) {
    targetsByName.set(name, target);
    return;
  }
  const existingTarget = targetsByName.get(name);
  if (existingTarget) targetsByName.set(name, resolveDuplicateCallTarget(existingTarget, target));
}

function resolveDuplicateCallTarget(
  existing: CFamilyCallDeclarationTarget,
  target: CFamilyCallDeclarationTarget,
): CFamilyCallDeclarationTarget | null {
  if (prefersExistingTarget(existing, target)) return existing;
  if (prefersNewTarget(existing, target)) return target;
  return sameCallTarget(existing, target) ? existing : null;
}

function prefersExistingTarget(existing: CFamilyCallDeclarationTarget, target: CFamilyCallDeclarationTarget): boolean {
  return existing.symbolKind === 'function' && target.symbolKind === 'prototype';
}

function prefersNewTarget(existing: CFamilyCallDeclarationTarget, target: CFamilyCallDeclarationTarget): boolean {
  return existing.symbolKind === 'prototype' && target.symbolKind === 'function';
}

function sameCallTarget(left: CFamilyCallDeclarationTarget, right: CFamilyCallDeclarationTarget): boolean {
  return left.filePath === right.filePath && left.symbolId === right.symbolId;
}

export function resolveCallTarget(
  declarations: CFamilyCallDeclarations,
  calleeName: string,
): CFamilyCallDeclarationTarget | null {
  return declarations.functionTargetByName.get(calleeName) ?? null;
}

export function createCallBinding(calleeName: string, targetPath: string): ImportedBinding {
  return { importedName: calleeName, localName: calleeName, resolvedPath: targetPath, specifier: calleeName };
}
