import type Parser from 'tree-sitter';

type TreeSitterConstructor = new () => Parser;

export interface ITreeSitterBindings {
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

let treeSitterBindingsPromise: Promise<ITreeSitterBindings | null> | undefined;
export async function loadTreeSitterBindings(): Promise<ITreeSitterBindings | null> {
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
      console.warn(
        `[CodeGraphy] Tree-sitter bindings unavailable; skipping core Tree-sitter analysis. ${String(error)}`,
      );

      return null;
    });

  return treeSitterBindingsPromise;
}
