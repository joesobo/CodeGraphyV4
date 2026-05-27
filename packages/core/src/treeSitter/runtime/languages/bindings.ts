import type { TREE_SITTER_SUPPORTED_EXTENSIONS } from './extensions';
import type { TreeSitterRuntimeBinding } from './kinds';
import { TREE_SITTER_C_FAMILY_BINDINGS } from './bindingsCFamily';
import { TREE_SITTER_JAVASCRIPT_BINDINGS } from './bindingsJavaScript';
import { TREE_SITTER_OTHER_BINDINGS } from './bindingsOther';

export const TREE_SITTER_RUNTIME_BINDINGS: Record<
  (typeof TREE_SITTER_SUPPORTED_EXTENSIONS)[number],
  TreeSitterRuntimeBinding
> = {
  ...TREE_SITTER_C_FAMILY_BINDINGS,
  ...TREE_SITTER_JAVASCRIPT_BINDINGS,
  ...TREE_SITTER_OTHER_BINDINGS,
};
