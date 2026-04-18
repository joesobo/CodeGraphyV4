import { findExistingFile as readExistingFile } from './existingFile';
import { getStringSpecifier as readStringSpecifier } from './stringSpecifier';
import {
  getIdentifierText as readIdentifierText,
  getLastPathSegment as readLastPathSegment,
  getNodeText as readNodeText,
  joinModuleSpecifier as readJoinedModuleSpecifier,
} from './text';

export const findExistingFile = readExistingFile;
export const getStringSpecifier = readStringSpecifier;
export const getIdentifierText = readIdentifierText;
export const getLastPathSegment = readLastPathSegment;
export const getNodeText = readNodeText;
export const joinModuleSpecifier = readJoinedModuleSpecifier;
