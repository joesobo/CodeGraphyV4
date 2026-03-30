import { type OrganizeFileIssue } from '../types';
import { LOW_INFO_NAME_DETAILS } from './lowInfoDetails';
import { stripExtension } from './nameStrip';

export interface LowInfoNameConfig {
  banned: string[];
  discouraged: string[];
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
