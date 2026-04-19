import * as path from 'node:path';

export type TreeSitterLanguageKind =
  | 'csharp'
  | 'go'
  | 'java'
  | 'javascript'
  | 'python'
  | 'rust'
  | 'tsx'
  | 'typescript';

export type TreeSitterRuntimeBinding = {
  languageKind: TreeSitterLanguageKind;
  language: 'csharp' | 'go' | 'java' | 'javaScript' | 'python' | 'rust' | 'tsx' | 'typeScript';
};

export const TREE_SITTER_SOURCE_IDS = {
  call: 'codegraphy.treesitter:call',
  commonjsRequire: 'codegraphy.treesitter:commonjs-require',
  dynamicImport: 'codegraphy.treesitter:dynamic-import',
  import: 'codegraphy.treesitter:import',
  inherit: 'codegraphy.treesitter:inherit',
  reference: 'codegraphy.treesitter:reference',
  reexport: 'codegraphy.treesitter:reexport',
  typeImport: 'codegraphy.treesitter:type-import',
} as const;

export const TREE_SITTER_SUPPORTED_EXTENSIONS = [
  '.cjs',
  '.cs',
  '.cts',
  '.go',
  '.java',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.py',
  '.pyi',
  '.rs',
  '.ts',
  '.tsx',
] as const;

export const TREE_SITTER_RUNTIME_BINDINGS: Record<
  (typeof TREE_SITTER_SUPPORTED_EXTENSIONS)[number],
  TreeSitterRuntimeBinding
> = {
  '.cjs': { languageKind: 'javascript', language: 'javaScript' },
  '.cs': { languageKind: 'csharp', language: 'csharp' },
  '.cts': { languageKind: 'typescript', language: 'typeScript' },
  '.go': { languageKind: 'go', language: 'go' },
  '.java': { languageKind: 'java', language: 'java' },
  '.js': { languageKind: 'javascript', language: 'javaScript' },
  '.jsx': { languageKind: 'javascript', language: 'javaScript' },
  '.mjs': { languageKind: 'javascript', language: 'javaScript' },
  '.mts': { languageKind: 'typescript', language: 'typeScript' },
  '.py': { languageKind: 'python', language: 'python' },
  '.pyi': { languageKind: 'python', language: 'python' },
  '.rs': { languageKind: 'rust', language: 'rust' },
  '.ts': { languageKind: 'typescript', language: 'typeScript' },
  '.tsx': { languageKind: 'tsx', language: 'tsx' },
};

export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

export function supportsTreeSitterFile(filePath: string): boolean {
  return TREE_SITTER_SUPPORTED_EXTENSIONS.includes(
    getFileExtension(filePath) as (typeof TREE_SITTER_SUPPORTED_EXTENSIONS)[number],
  );
}
