import type Parser from 'tree-sitter';
import {
  getFileExtension,
  supportsTreeSitterFile,
  TREE_SITTER_RUNTIME_BINDINGS,
  type TreeSitterLanguageKind,
} from './catalog';
import { loadTreeSitterBindings } from './load';

export interface ITreeSitterRuntime {
  languageKind: TreeSitterLanguageKind;
  parser: Parser;
}

async function getTreeSitterLanguageForFile(filePath: string): Promise<{
  ParserCtor: (new () => Parser);
  languageKind: TreeSitterLanguageKind;
  language: Parser.Language;
} | null> {
  const bindings = await loadTreeSitterBindings();
  if (!bindings) {
    return null;
  }

  const binding = TREE_SITTER_RUNTIME_BINDINGS[
    getFileExtension(filePath) as keyof typeof TREE_SITTER_RUNTIME_BINDINGS
  ];
  if (!binding) {
    return null;
  }

  return {
    ParserCtor: bindings.ParserCtor,
    languageKind: binding.languageKind,
    language: bindings[binding.language],
  };
}

function createParser(
  runtime: Awaited<ReturnType<typeof getTreeSitterLanguageForFile>>,
): Parser | null {
  if (!runtime) {
    return null;
  }

  const parser = new runtime.ParserCtor();
  parser.setLanguage(runtime.language);
  return parser;
}

export async function createTreeSitterParser(filePath: string): Promise<Parser | null> {
  if (!supportsTreeSitterFile(filePath)) {
    return null;
  }

  return createParser(await getTreeSitterLanguageForFile(filePath));
}

export async function createTreeSitterRuntime(filePath: string): Promise<ITreeSitterRuntime | null> {
  if (!supportsTreeSitterFile(filePath)) {
    return null;
  }

  const runtime = await getTreeSitterLanguageForFile(filePath);
  const parser = createParser(runtime);
  if (!runtime || !parser) {
    return null;
  }

  return {
    languageKind: runtime.languageKind,
    parser,
  };
}
