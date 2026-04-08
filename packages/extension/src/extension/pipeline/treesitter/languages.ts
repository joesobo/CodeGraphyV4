import * as path from 'node:path';
import Parser from 'tree-sitter';
import JavaScriptBinding from 'tree-sitter-javascript';
import TypeScriptLanguages from 'tree-sitter-typescript';

const TypeScript = TypeScriptLanguages as unknown as {
  tsx: Parser.Language;
  typescript: Parser.Language;
};
const JavaScript = JavaScriptBinding as unknown as Parser.Language;

export const TREE_SITTER_SOURCE_IDS = {
  call: 'codegraphy.core.treesitter:call',
  import: 'codegraphy.core.treesitter:import',
  reexport: 'codegraphy.core.treesitter:reexport',
} as const;

export function getTreeSitterLanguageForFile(filePath: string): Parser.Language | null {
  switch (path.extname(filePath).toLowerCase()) {
    case '.cjs':
    case '.js':
    case '.jsx':
    case '.mjs':
      return JavaScript;
    case '.cts':
    case '.mts':
    case '.ts':
      return TypeScript.typescript;
    case '.tsx':
      return TypeScript.tsx;
    default:
      return null;
  }
}
