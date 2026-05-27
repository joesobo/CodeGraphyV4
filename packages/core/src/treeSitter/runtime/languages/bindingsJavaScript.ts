import type { TreeSitterRuntimeBinding } from './kinds';

export const TREE_SITTER_JAVASCRIPT_BINDINGS = {
  '.cjs': { languageKind: 'javascript', language: 'javaScript' },
  '.cts': { languageKind: 'typescript', language: 'typeScript' },
  '.js': { languageKind: 'javascript', language: 'javaScript' },
  '.jsx': { languageKind: 'javascript', language: 'javaScript' },
  '.mjs': { languageKind: 'javascript', language: 'javaScript' },
  '.mts': { languageKind: 'typescript', language: 'typeScript' },
  '.ts': { languageKind: 'typescript', language: 'typeScript' },
  '.tsx': { languageKind: 'tsx', language: 'tsx' },
} satisfies Record<string, TreeSitterRuntimeBinding>;
