import * as path from 'node:path';
export type { TreeSitterLanguageKind, TreeSitterRuntimeBinding } from './kinds';
export { TREE_SITTER_RUNTIME_BINDINGS } from './bindings';
export { TREE_SITTER_SOURCE_IDS } from './sourceIds';
export { TREE_SITTER_SUPPORTED_EXTENSIONS } from './extensions';
import { TREE_SITTER_SUPPORTED_EXTENSIONS } from './extensions';

export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

export function supportsTreeSitterFile(filePath: string): boolean {
  return TREE_SITTER_SUPPORTED_EXTENSIONS.includes(
    getFileExtension(filePath) as (typeof TREE_SITTER_SUPPORTED_EXTENSIONS)[number],
  );
}
