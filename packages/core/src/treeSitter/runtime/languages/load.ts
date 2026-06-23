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

const TREE_SITTER_LANGUAGE_LOADERS: Record<TreeSitterLanguageBindingName, TreeSitterLanguageLoader> = {
  cLanguage: async () => (await import('tree-sitter-c')).default as unknown as Parser.Language,
  cpp: async () => (await import('tree-sitter-cpp')).default as unknown as Parser.Language,
  csharp: async () => (await import('tree-sitter-c-sharp')).default as unknown as Parser.Language,
  dart: async () => (await import('@driftlog/tree-sitter-dart')).default as unknown as Parser.Language,
  go: async () => (await import('tree-sitter-go')).default as unknown as Parser.Language,
  haskell: async () => (await import('tree-sitter-haskell')).default as unknown as Parser.Language,
  java: async () => (await import('tree-sitter-java')).default as unknown as Parser.Language,
  javaScript: async () => (await import('tree-sitter-javascript')).default as unknown as Parser.Language,
  kotlin: async () => (await import('@tree-sitter-grammars/tree-sitter-kotlin')).default as unknown as Parser.Language,
  lua: async () => (await import('@tree-sitter-grammars/tree-sitter-lua')).default as unknown as Parser.Language,
  objectiveC: async () => (await import('tree-sitter-objc')).default as unknown as Parser.Language,
  php: async () => ((await import('tree-sitter-php')).default as unknown as { php: Parser.Language }).php,
  python: async () => (await import('tree-sitter-python')).default as unknown as Parser.Language,
  ruby: async () => (await import('tree-sitter-ruby')).default as unknown as Parser.Language,
  rust: async () => (await import('tree-sitter-rust')).default as unknown as Parser.Language,
  scala: async () => (await import('tree-sitter-scala')).default as unknown as Parser.Language,
  swift: async () => (await import('tree-sitter-swift')).default as unknown as Parser.Language,
  tsx: async () => ((await import('tree-sitter-typescript')).default as unknown as {
    tsx: Parser.Language;
  }).tsx,
  typeScript: async () => ((await import('tree-sitter-typescript')).default as unknown as {
    typescript: Parser.Language;
  }).typescript,
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
    import('@tree-sitter-grammars/tree-sitter-lua'),
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
    ]) => {
      const typeScriptLanguages = typeScriptModule.default as unknown as {
        tsx: Parser.Language;
        typescript: Parser.Language;
      };

      return {
        ParserCtor,
        cLanguage: cModule.default as unknown as Parser.Language,
        cpp: cppModule.default as unknown as Parser.Language,
        csharp: csharpModule.default as unknown as Parser.Language,
        dart: dartModule.default as unknown as Parser.Language,
        go: goModule.default as unknown as Parser.Language,
        haskell: haskellModule.default as unknown as Parser.Language,
        java: javaModule.default as unknown as Parser.Language,
        javaScript: javaScriptModule.default as unknown as Parser.Language,
        kotlin: kotlinModule.default as unknown as Parser.Language,
        lua: luaModule.default as unknown as Parser.Language,
        objectiveC: objectiveCModule.default as unknown as Parser.Language,
        php: (phpModule.default as unknown as { php: Parser.Language }).php,
        python: pythonModule.default as unknown as Parser.Language,
        ruby: rubyModule.default as unknown as Parser.Language,
        rust: rustModule.default as unknown as Parser.Language,
        scala: scalaModule.default as unknown as Parser.Language,
        swift: swiftModule.default as unknown as Parser.Language,
        tsx: typeScriptLanguages.tsx,
        typeScript: typeScriptLanguages.typescript,
      };
    })
    .catch((error: unknown) => {
      warnTreeSitterBindingsUnavailable(error);

      return null;
    });

  return treeSitterBindingsPromise;
}
