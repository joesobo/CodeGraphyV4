import * as path from 'node:path';

export type TreeSitterLanguageKind =
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'go'
  | 'java'
  | 'javascript'
  | 'kotlin'
  | 'python'
  | 'rust'
  | 'tsx'
  | 'typescript';

export type TreeSitterRuntimeBinding = {
  languageKind: TreeSitterLanguageKind;
  language:
    | 'cLanguage'
    | 'cpp'
    | 'csharp'
    | 'go'
    | 'java'
    | 'javaScript'
    | 'kotlin'
    | 'python'
    | 'rust'
    | 'tsx'
    | 'typeScript';
};

export const TREE_SITTER_SOURCE_IDS = {
  call: 'codegraphy.treesitter:call',
  commonjsRequire: 'codegraphy.treesitter:commonjs-require',
  dynamicImport: 'codegraphy.treesitter:dynamic-import',
  include: 'codegraphy.treesitter:include',
  import: 'codegraphy.treesitter:import',
  inherit: 'codegraphy.treesitter:inherit',
  reference: 'codegraphy.treesitter:reference',
  reexport: 'codegraphy.treesitter:reexport',
  typeImport: 'codegraphy.treesitter:type-import',
} as const;

export const TREE_SITTER_SUPPORTED_EXTENSIONS = [
  '.c',
  '.cc',
  '.cjs',
  '.cpp',
  '.cs',
  '.cts',
  '.cxx',
  '.go',
  '.h',
  '.hh',
  '.hpp',
  '.hxx',
  '.java',
  '.js',
  '.jsx',
  '.kt',
  '.kts',
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
  '.c': { languageKind: 'c', language: 'cLanguage' },
  '.cc': { languageKind: 'cpp', language: 'cpp' },
  '.cjs': { languageKind: 'javascript', language: 'javaScript' },
  '.cpp': { languageKind: 'cpp', language: 'cpp' },
  '.cs': { languageKind: 'csharp', language: 'csharp' },
  '.cts': { languageKind: 'typescript', language: 'typeScript' },
  '.cxx': { languageKind: 'cpp', language: 'cpp' },
  '.go': { languageKind: 'go', language: 'go' },
  '.h': { languageKind: 'c', language: 'cLanguage' },
  '.hh': { languageKind: 'cpp', language: 'cpp' },
  '.hpp': { languageKind: 'cpp', language: 'cpp' },
  '.hxx': { languageKind: 'cpp', language: 'cpp' },
  '.java': { languageKind: 'java', language: 'java' },
  '.js': { languageKind: 'javascript', language: 'javaScript' },
  '.jsx': { languageKind: 'javascript', language: 'javaScript' },
  '.kt': { languageKind: 'kotlin', language: 'kotlin' },
  '.kts': { languageKind: 'kotlin', language: 'kotlin' },
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
