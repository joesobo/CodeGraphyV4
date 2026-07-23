import type Parser from 'tree-sitter';
import type { TreeSitterRuntimeBinding } from './kinds';

type TreeSitterConstructor = new () => Parser;
type TreeSitterLanguageBindingName = TreeSitterRuntimeBinding['language'];
type TreeSitterLanguageLoader = () => Promise<Parser.Language>;

export interface ITreeSitterBindings {
  ParserCtor: TreeSitterConstructor;
  cLanguage: Parser.Language;
  cpp: Parser.Language;
  csharp: Parser.Language;
  dart: Parser.Language;
  go: Parser.Language;
  haskell: Parser.Language;
  java: Parser.Language;
  javaScript: Parser.Language;
  kotlin: Parser.Language;
  lua: Parser.Language;
  objectiveC: Parser.Language;
  php: Parser.Language;
  python: Parser.Language;
  ruby: Parser.Language;
  rust: Parser.Language;
  scala: Parser.Language;
  swift: Parser.Language;
  tsx: Parser.Language;
  typeScript: Parser.Language;
}

export interface ITreeSitterLanguageBinding {
  ParserCtor: TreeSitterConstructor;
  language: Parser.Language;
}

function warnTreeSitterBindingsUnavailable(error: unknown): void {
  console.warn(
    `[CodeGraphy] Tree-sitter bindings unavailable; skipping core Tree-sitter analysis. ${String(error)}`,
  );
}

let treeSitterParserCtorPromise: Promise<TreeSitterConstructor> | undefined;
function loadTreeSitterParserCtor(): Promise<TreeSitterConstructor> {
  treeSitterParserCtorPromise ??= import('tree-sitter')
    .then(parserModule => parserModule.default);

  return treeSitterParserCtorPromise;
}

function toTreeSitterLanguage(value: unknown): Parser.Language {
  return value as Parser.Language;
}

function readLanguageModuleDefault(module: { default: unknown }): Parser.Language {
  return toTreeSitterLanguage(module.default);
}

function readLanguageModuleProperty(
  module: { default: unknown },
  property: string,
): Parser.Language {
  return toTreeSitterLanguage((module.default as Record<string, unknown>)[property]);
}

const TREE_SITTER_LANGUAGE_LOADERS: Record<TreeSitterLanguageBindingName, TreeSitterLanguageLoader> = {
  cLanguage: async () => readLanguageModuleDefault(await import('tree-sitter-c')),
  cpp: async () => readLanguageModuleDefault(await import('tree-sitter-cpp')),
  csharp: async () => readLanguageModuleDefault(await import('tree-sitter-c-sharp')),
  dart: async () => readLanguageModuleDefault(await import('@driftlog/tree-sitter-dart')),
  go: async () => readLanguageModuleDefault(await import('tree-sitter-go')),
  haskell: async () => readLanguageModuleDefault(await import('tree-sitter-haskell')),
  java: async () => readLanguageModuleDefault(await import('tree-sitter-java')),
  javaScript: async () => readLanguageModuleDefault(await import('tree-sitter-javascript')),
  kotlin: async () => readLanguageModuleDefault(await import('@tree-sitter-grammars/tree-sitter-kotlin')),
  lua: async () => readLanguageModuleDefault(
    await import('@tree-sitter-grammars/tree-sitter-lua/bindings/node/index.js'),
  ),
  objectiveC: async () => readLanguageModuleDefault(await import('tree-sitter-objc')),
  php: async () => readLanguageModuleProperty(await import('tree-sitter-php'), 'php'),
  python: async () => readLanguageModuleDefault(await import('tree-sitter-python')),
  ruby: async () => readLanguageModuleDefault(await import('tree-sitter-ruby')),
  rust: async () => readLanguageModuleDefault(await import('tree-sitter-rust')),
  scala: async () => readLanguageModuleDefault(await import('tree-sitter-scala')),
  swift: async () => readLanguageModuleDefault(await import('tree-sitter-swift')),
  tsx: async () => readLanguageModuleProperty(await import('tree-sitter-typescript'), 'tsx'),
  typeScript: async () => readLanguageModuleProperty(await import('tree-sitter-typescript'), 'typescript'),
};

async function loadTreeSitterLanguage(
  language: TreeSitterLanguageBindingName,
): Promise<Parser.Language> {
  return TREE_SITTER_LANGUAGE_LOADERS[language]();
}

const treeSitterLanguageBindingPromises = new Map<
  TreeSitterLanguageBindingName,
  Promise<ITreeSitterLanguageBinding | null>
>();

export function loadTreeSitterLanguageBinding(
  language: TreeSitterLanguageBindingName,
): Promise<ITreeSitterLanguageBinding | null> {
  const cached = treeSitterLanguageBindingPromises.get(language);
  if (cached) {
    return cached;
  }

  const promise = Promise.all([
    loadTreeSitterParserCtor(),
    loadTreeSitterLanguage(language),
  ])
    .then(([ParserCtor, languageBinding]) =>
      ({ ParserCtor, language: languageBinding }),
    )
    .catch((error: unknown) => {
      warnTreeSitterBindingsUnavailable(error);
      return null;
    });
  treeSitterLanguageBindingPromises.set(language, promise);
  return promise;
}

let treeSitterBindingsPromise: Promise<ITreeSitterBindings | null> | undefined;
export async function loadTreeSitterBindings(): Promise<ITreeSitterBindings | null> {
  treeSitterBindingsPromise ??= Promise.all([
    loadTreeSitterParserCtor(),
    import('tree-sitter-c'),
    import('tree-sitter-cpp'),
    import('tree-sitter-c-sharp'),
    import('@driftlog/tree-sitter-dart'),
    import('tree-sitter-go'),
    import('tree-sitter-haskell'),
    import('tree-sitter-java'),
    import('tree-sitter-javascript'),
    import('@tree-sitter-grammars/tree-sitter-kotlin'),
    import('@tree-sitter-grammars/tree-sitter-lua/bindings/node/index.js'),
    import('tree-sitter-objc'),
    import('tree-sitter-php'),
    import('tree-sitter-python'),
    import('tree-sitter-ruby'),
    import('tree-sitter-rust'),
    import('tree-sitter-scala'),
    import('tree-sitter-swift'),
    import('tree-sitter-typescript'),
  ])
    .then(([
      ParserCtor,
      cModule,
      cppModule,
      csharpModule,
      dartModule,
      goModule,
      haskellModule,
      javaModule,
      javaScriptModule,
      kotlinModule,
      luaModule,
      objectiveCModule,
      phpModule,
      pythonModule,
      rubyModule,
      rustModule,
      scalaModule,
      swiftModule,
      typeScriptModule,
    ]) => ({
      ParserCtor,
      cLanguage: readLanguageModuleDefault(cModule),
      cpp: readLanguageModuleDefault(cppModule),
      csharp: readLanguageModuleDefault(csharpModule),
      dart: readLanguageModuleDefault(dartModule),
      go: readLanguageModuleDefault(goModule),
      haskell: readLanguageModuleDefault(haskellModule),
      java: readLanguageModuleDefault(javaModule),
      javaScript: readLanguageModuleDefault(javaScriptModule),
      kotlin: readLanguageModuleDefault(kotlinModule),
      lua: readLanguageModuleDefault(luaModule),
      objectiveC: readLanguageModuleDefault(objectiveCModule),
      php: readLanguageModuleProperty(phpModule, 'php'),
      python: readLanguageModuleDefault(pythonModule),
      ruby: readLanguageModuleDefault(rubyModule),
      rust: readLanguageModuleDefault(rustModule),
      scala: readLanguageModuleDefault(scalaModule),
      swift: readLanguageModuleDefault(swiftModule),
      tsx: readLanguageModuleProperty(typeScriptModule, 'tsx'),
      typeScript: readLanguageModuleProperty(typeScriptModule, 'typescript'),
    }))
    .catch((error: unknown) => {
      warnTreeSitterBindingsUnavailable(error);

      return null;
    });

  return treeSitterBindingsPromise;
}
