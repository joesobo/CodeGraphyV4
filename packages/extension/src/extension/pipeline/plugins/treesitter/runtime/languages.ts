import * as path from 'node:path';
import type Parser from 'tree-sitter';

type TreeSitterConstructor = new () => Parser;

export type TreeSitterLanguageKind =
  | 'csharp'
  | 'go'
  | 'java'
  | 'javascript'
  | 'python'
  | 'rust'
  | 'tsx'
  | 'typescript';

interface ITreeSitterBindings {
  ParserCtor: TreeSitterConstructor;
  csharp: Parser.Language;
  go: Parser.Language;
  java: Parser.Language;
  javaScript: Parser.Language;
  python: Parser.Language;
  rust: Parser.Language;
  tsx: Parser.Language;
  typeScript: Parser.Language;
}

export interface ITreeSitterRuntime {
  languageKind: TreeSitterLanguageKind;
  parser: Parser;
}

let treeSitterBindingsPromise: Promise<ITreeSitterBindings | null> | undefined;
let treeSitterBindingsUnavailableLogged = false;

export const TREE_SITTER_SOURCE_IDS = {
  call: 'codegraphy.treesitter:call',
  commonjsRequire: 'codegraphy.treesitter:commonjs-require',
  dynamicImport: 'codegraphy.treesitter:dynamic-import',
  import: 'codegraphy.treesitter:import',
  inherit: 'codegraphy.treesitter:inherit',
  reference: 'codegraphy.treesitter:reference',
  reexport: 'codegraphy.treesitter:reexport',
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

function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

export function supportsTreeSitterFile(filePath: string): boolean {
  return TREE_SITTER_SUPPORTED_EXTENSIONS.includes(
    getFileExtension(filePath) as (typeof TREE_SITTER_SUPPORTED_EXTENSIONS)[number],
  );
}

async function loadTreeSitterBindings(): Promise<ITreeSitterBindings | null> {
  treeSitterBindingsPromise ??= Promise.all([
    import('tree-sitter'),
    import('tree-sitter-c-sharp'),
    import('tree-sitter-go'),
    import('tree-sitter-java'),
    import('tree-sitter-javascript'),
    import('tree-sitter-python'),
    import('tree-sitter-rust'),
    import('tree-sitter-typescript'),
  ])
    .then(([
      parserModule,
      csharpModule,
      goModule,
      javaModule,
      javaScriptModule,
      pythonModule,
      rustModule,
      typeScriptModule,
    ]) => {
      const ParserCtor = parserModule.default;
      const typeScriptLanguages = typeScriptModule.default as unknown as {
        tsx: Parser.Language;
        typescript: Parser.Language;
      };

      return {
        ParserCtor,
        csharp: csharpModule.default as unknown as Parser.Language,
        go: goModule.default as unknown as Parser.Language,
        java: javaModule.default as unknown as Parser.Language,
        javaScript: javaScriptModule.default as unknown as Parser.Language,
        python: pythonModule.default as unknown as Parser.Language,
        rust: rustModule.default as unknown as Parser.Language,
        tsx: typeScriptLanguages.tsx,
        typeScript: typeScriptLanguages.typescript,
      };
    })
    .catch((error: unknown) => {
      if (!treeSitterBindingsUnavailableLogged) {
        treeSitterBindingsUnavailableLogged = true;
        console.warn(
          `[CodeGraphy] Tree-sitter bindings unavailable; skipping core Tree-sitter analysis. ${String(error)}`,
        );
      }

      return null;
    });

  return treeSitterBindingsPromise;
}

async function getTreeSitterLanguageForFile(filePath: string): Promise<{
  ParserCtor: TreeSitterConstructor;
  languageKind: TreeSitterLanguageKind;
  language: Parser.Language;
} | null> {
  const bindings = await loadTreeSitterBindings();
  if (!bindings) {
    return null;
  }

  switch (getFileExtension(filePath)) {
    case '.cjs':
    case '.js':
    case '.jsx':
    case '.mjs':
      return {
        ParserCtor: bindings.ParserCtor,
        languageKind: 'javascript',
        language: bindings.javaScript,
      };
    case '.cs':
      return {
        ParserCtor: bindings.ParserCtor,
        languageKind: 'csharp',
        language: bindings.csharp,
      };
    case '.go':
      return {
        ParserCtor: bindings.ParserCtor,
        languageKind: 'go',
        language: bindings.go,
      };
    case '.java':
      return {
        ParserCtor: bindings.ParserCtor,
        languageKind: 'java',
        language: bindings.java,
      };
    case '.py':
    case '.pyi':
      return {
        ParserCtor: bindings.ParserCtor,
        languageKind: 'python',
        language: bindings.python,
      };
    case '.rs':
      return {
        ParserCtor: bindings.ParserCtor,
        languageKind: 'rust',
        language: bindings.rust,
      };
    case '.cts':
    case '.mts':
    case '.ts':
      return {
        ParserCtor: bindings.ParserCtor,
        languageKind: 'typescript',
        language: bindings.typeScript,
      };
    case '.tsx':
      return {
        ParserCtor: bindings.ParserCtor,
        languageKind: 'tsx',
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

export async function createTreeSitterRuntime(filePath: string): Promise<ITreeSitterRuntime | null> {
  if (!supportsTreeSitterFile(filePath)) {
    return null;
  }

  const runtime = await getTreeSitterLanguageForFile(filePath);
  if (!runtime) {
    return null;
  }

  const parser = new runtime.ParserCtor();
  parser.setLanguage(runtime.language);
  return {
    languageKind: runtime.languageKind,
    parser,
  };
}
