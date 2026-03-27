import { type OrganizeFileIssue } from '../organizeTypes';

export interface LowInfoNameConfig {
  banned: string[];
  discouraged: string[];
}

const LOW_INFO_NAME_DETAILS: Record<string, string> = {
  utils: "Catch-all dumping ground; violates single responsibility",
  helpers: "Vague semantics; becomes unmaintainable",
  misc: "Literally means 'uncategorized'",
  common: "Attracts unrelated shared code",
  shared: "Breaks architectural layers; grows uncontrollably",
  _shared: "Variant of shared with same problems",
  lib: "Too generic; doesn't describe contents",
  index: "Indistinguishable in IDE tabs; breaks Go to Definition",
  types: "Can become a dump for unrelated type definitions",
  constants: "Can become a dump for unrelated values",
  config: "Vague without domain context",
  base: "Abstract without inheritance context",
  core: "Too broad; doesn't narrow scope"
};

function stripExtension(fileName: string): string {
  // Remove compound test extensions and regular extensions
  let baseName = fileName;

  // Strip compound test extensions first
  baseName = baseName.replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, '');

  // If no change was made, strip single extension
  if (baseName === fileName) {
    const lastDot = baseName.lastIndexOf('.');
    if (lastDot > 0) {
      baseName = baseName.slice(0, lastDot);
    }
  }

  return baseName;
}

export function checkLowInfoName(
  fileName: string,
  config: LowInfoNameConfig,
  isPackageEntryPoint?: boolean
): OrganizeFileIssue | undefined {
  const baseName = stripExtension(fileName);
  const lowerBaseName = baseName.toLowerCase();

  // index.ts is allowed if it's a package entry point
  if (lowerBaseName === 'index' && isPackageEntryPoint) {
    return undefined;
  }

  // Check banned names
  const bannedIndex = config.banned.findIndex(name => name.toLowerCase() === lowerBaseName);
  if (bannedIndex >= 0) {
    const bannedName = config.banned[bannedIndex];
    const detail = LOW_INFO_NAME_DETAILS[bannedName] ?? 'Low-information filename';
    return {
      detail,
      fileName,
      kind: 'low-info-banned'
    };
  }

  // Check discouraged names
  const discouragedIndex = config.discouraged.findIndex(name => name.toLowerCase() === lowerBaseName);
  if (discouragedIndex >= 0) {
    const discouragedName = config.discouraged[discouragedIndex];
    const detail = LOW_INFO_NAME_DETAILS[discouragedName] ?? 'Low-information filename';
    return {
      detail,
      fileName,
      kind: 'low-info-discouraged'
    };
  }

  return undefined;
}
