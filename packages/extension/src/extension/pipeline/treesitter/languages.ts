import * as path from 'node:path';
import type Parser from 'tree-sitter';

type TreeSitterConstructor = new () => Parser;

interface ITreeSitterBindings {
  ParserCtor: TreeSitterConstructor;
  javaScript: Parser.Language;
  tsx: Parser.Language;
  typeScript: Parser.Language;
}

let treeSitterBindingsPromise: Promise<ITreeSitterBindings> | undefined;

export const TREE_SITTER_SOURCE_IDS = {
  call: 'codegraphy.core.treesitter:call',
  import: 'codegraphy.core.treesitter:import',
  reexport: 'codegraphy.core.treesitter:reexport',
} as const;

function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

export function supportsTreeSitterFile(filePath: string): boolean {
  switch (getFileExtension(filePath)) {
    case '.cjs':
    case '.cts':
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.mts':
    case '.ts':
    case '.tsx':
      return true;
    default:
      return false;
  }
}

async function loadTreeSitterBindings(): Promise<ITreeSitterBindings> {
  treeSitterBindingsPromise ??= Promise.all([
    import('tree-sitter'),
    import('tree-sitter-javascript'),
    import('tree-sitter-typescript'),
  ]).then(([parserModule, javaScriptModule, typeScriptModule]) => {
    const ParserCtor = parserModule.default;
    const typeScriptLanguages = typeScriptModule.default as unknown as {
      tsx: Parser.Language;
      typescript: Parser.Language;
    };

    return {
      ParserCtor,
      javaScript: javaScriptModule.default as unknown as Parser.Language,
      tsx: typeScriptLanguages.tsx,
      typeScript: typeScriptLanguages.typescript,
    };
  });

  return treeSitterBindingsPromise;
}

async function getTreeSitterLanguageForFile(filePath: string): Promise<{
  ParserCtor: TreeSitterConstructor;
  language: Parser.Language;
} | null> {
  const bindings = await loadTreeSitterBindings();

  switch (path.extname(filePath).toLowerCase()) {
    case '.cjs':
    case '.js':
    case '.jsx':
    case '.mjs':
      return {
        ParserCtor: bindings.ParserCtor,
        language: bindings.javaScript,
      };
    case '.cts':
    case '.mts':
    case '.ts':
      return {
        ParserCtor: bindings.ParserCtor,
        language: bindings.typeScript,
      };
    case '.tsx':
      return {
        ParserCtor: bindings.ParserCtor,
        language: bindings.tsx,
      };
    default:
      return null;
  }
}

export async function createTreeSitterParser(filePath: string): Promise<Parser | null> {
  if (!supportsTreeSitterFile(filePath)) {
    return null;
  }

  const runtime = await getTreeSitterLanguageForFile(filePath);
  if (!runtime) {
    return null;
  }

  const parser = new runtime.ParserCtor();
  parser.setLanguage(runtime.language);
  return parser;
}
