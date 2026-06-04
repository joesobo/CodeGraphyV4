import type Parser from 'tree-sitter';

type TreeSitterConstructor = new () => Parser;

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

let treeSitterBindingsPromise: Promise<ITreeSitterBindings | null> | undefined;
export async function loadTreeSitterBindings(): Promise<ITreeSitterBindings | null> {
  treeSitterBindingsPromise ??= Promise.all([
    import('tree-sitter'),
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
      parserModule,
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
      const ParserCtor = parserModule.default;
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
      console.warn(
        `[CodeGraphy] Tree-sitter bindings unavailable; skipping core Tree-sitter analysis. ${String(error)}`,
      );

      return null;
    });

  return treeSitterBindingsPromise;
}
