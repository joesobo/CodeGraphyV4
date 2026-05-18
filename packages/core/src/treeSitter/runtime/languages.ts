import {
  TREE_SITTER_SOURCE_IDS as SOURCE_IDS,
  TREE_SITTER_SUPPORTED_EXTENSIONS as SUPPORTED_EXTENSIONS,
  supportsTreeSitterFile as supportsFile,
  type TreeSitterLanguageKind,
} from './languages/catalog';
import {
  createTreeSitterParser as createParser,
  createTreeSitterRuntime as createRuntime,
  type ITreeSitterRuntime,
} from './languages/parser';

export type { TreeSitterLanguageKind, ITreeSitterRuntime };
export const TREE_SITTER_SOURCE_IDS = SOURCE_IDS;
export const TREE_SITTER_SUPPORTED_EXTENSIONS = SUPPORTED_EXTENSIONS;
export const supportsTreeSitterFile = supportsFile;
export const createTreeSitterParser = createParser;
export const createTreeSitterRuntime = createRuntime;
