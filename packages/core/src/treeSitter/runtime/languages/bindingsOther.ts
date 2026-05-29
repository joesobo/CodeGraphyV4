import type { TreeSitterRuntimeBinding } from './kinds';

export const TREE_SITTER_OTHER_BINDINGS = {
  '.dart': { languageKind: 'dart', language: 'dart' },
  '.go': { languageKind: 'go', language: 'go' },
  '.hs': { languageKind: 'haskell', language: 'haskell' },
  '.java': { languageKind: 'java', language: 'java' },
  '.kt': { languageKind: 'kotlin', language: 'kotlin' },
  '.kts': { languageKind: 'kotlin', language: 'kotlin' },
  '.lhs': { languageKind: 'haskell', language: 'haskell' },
  '.lua': { languageKind: 'lua', language: 'lua' },
  '.php': { languageKind: 'php', language: 'php' },
  '.py': { languageKind: 'python', language: 'python' },
  '.pyi': { languageKind: 'python', language: 'python' },
  '.rb': { languageKind: 'ruby', language: 'ruby' },
  '.rs': { languageKind: 'rust', language: 'rust' },
  '.swift': { languageKind: 'swift', language: 'swift' },
} satisfies Record<string, TreeSitterRuntimeBinding>;
