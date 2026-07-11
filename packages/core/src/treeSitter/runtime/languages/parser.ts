import type Parser from 'tree-sitter';
import {
  getFileExtension,
  supportsTreeSitterFile,
  TREE_SITTER_RUNTIME_BINDINGS,
  type TreeSitterLanguageKind,
} from './catalog';
import { loadTreeSitterLanguageBinding } from './load';

export interface ITreeSitterRuntime {
  languageKind: TreeSitterLanguageKind;
  parser: Parser;
}

type TreeSitterParserConstructor = new () => Parser;

const parserByLanguage = new Map<TreeSitterLanguageKind, Parser>();

export function getOrCreateTreeSitterParser(
  languageKind: TreeSitterLanguageKind,
  ParserCtor: TreeSitterParserConstructor,
  language: Parser.Language,
): Parser {
  const existing = parserByLanguage.get(languageKind);
  if (existing) {
    return existing;
  }

  const parser = new ParserCtor();
  parser.setLanguage(language);
  parserByLanguage.set(languageKind, parser);
  return parser;
}

export function clearTreeSitterParserRegistry(): void {
  parserByLanguage.clear();
}

async function getTreeSitterLanguageForFile(filePath: string): Promise<{
  ParserCtor: (new () => Parser);
  languageKind: TreeSitterLanguageKind;
  language: Parser.Language;
} | null> {
  const binding = TREE_SITTER_RUNTIME_BINDINGS[
    getFileExtension(filePath) as keyof typeof TREE_SITTER_RUNTIME_BINDINGS
  ];
  if (!binding) {
    return null;
  }

  const languageBinding = await loadTreeSitterLanguageBinding(binding.language);
  if (!languageBinding) {
    return null;
  }

  return {
    ParserCtor: languageBinding.ParserCtor,
    languageKind: binding.languageKind,
    language: languageBinding.language,
  };
}

function createParser(
  runtime: Awaited<ReturnType<typeof getTreeSitterLanguageForFile>>,
): Parser | null {
  if (!runtime) {
    return null;
  }

  return getOrCreateTreeSitterParser(
    runtime.languageKind,
    runtime.ParserCtor,
    runtime.language,
  );
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
