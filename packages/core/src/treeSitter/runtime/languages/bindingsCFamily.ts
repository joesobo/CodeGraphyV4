import type { TreeSitterRuntimeBinding } from './kinds';

export const TREE_SITTER_C_FAMILY_BINDINGS = {
  '.c': { languageKind: 'c', language: 'cLanguage' },
  '.cc': { languageKind: 'cpp', language: 'cpp' },
  '.cpp': { languageKind: 'cpp', language: 'cpp' },
  '.cs': { languageKind: 'csharp', language: 'csharp' },
  '.cxx': { languageKind: 'cpp', language: 'cpp' },
  '.h': { languageKind: 'c', language: 'cLanguage' },
  '.hh': { languageKind: 'cpp', language: 'cpp' },
  '.hpp': { languageKind: 'cpp', language: 'cpp' },
  '.hxx': { languageKind: 'cpp', language: 'cpp' },
} satisfies Record<string, TreeSitterRuntimeBinding>;
