import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MODULE_PATH =
  '../../../src/treeSitter/runtime/languages/load';

describe('pipeline/plugins/treesitter/runtime/languages/load', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unmock('tree-sitter');
    vi.unmock('tree-sitter-c');
    vi.unmock('tree-sitter-cpp');
    vi.unmock('tree-sitter-c-sharp');
    vi.unmock('@driftlog/tree-sitter-dart');
    vi.unmock('tree-sitter-go');
    vi.unmock('tree-sitter-haskell');
    vi.unmock('tree-sitter-java');
    vi.unmock('tree-sitter-javascript');
    vi.unmock('@tree-sitter-grammars/tree-sitter-kotlin');
    vi.unmock('@tree-sitter-grammars/tree-sitter-lua');
    vi.unmock('tree-sitter-objc');
    vi.unmock('tree-sitter-php');
    vi.unmock('tree-sitter-python');
    vi.unmock('tree-sitter-ruby');
    vi.unmock('tree-sitter-rust');
    vi.unmock('tree-sitter-scala');
    vi.unmock('tree-sitter-swift');
    vi.unmock('tree-sitter-typescript');
  });

  it('loads and caches tree-sitter bindings from the language modules', async () => {
    class FakeParser {}
    const cLanguage = { name: 'c' };
    const cpp = { name: 'cpp' };
    const csharp = { name: 'csharp' };
    const dart = { name: 'dart' };
    const go = { name: 'go' };
    const haskell = { name: 'haskell' };
    const java = { name: 'java' };
    const javaScript = { name: 'javascript' };
    const kotlin = { name: 'kotlin' };
    const lua = { name: 'lua' };
    const objectiveC = { name: 'objective-c' };
    const php = { name: 'php' };
    const python = { name: 'python' };
    const ruby = { name: 'ruby' };
    const rust = { name: 'rust' };
    const scala = { name: 'scala' };
    const swift = { name: 'swift' };
    const tsx = { name: 'tsx' };
    const typeScript = { name: 'typescript' };

    vi.doMock('tree-sitter', () => ({ default: FakeParser }));
    vi.doMock('tree-sitter-c', () => ({ default: cLanguage }));
    vi.doMock('tree-sitter-cpp', () => ({ default: cpp }));
    vi.doMock('tree-sitter-c-sharp', () => ({ default: csharp }));
    vi.doMock('@driftlog/tree-sitter-dart', () => ({ default: dart }));
    vi.doMock('tree-sitter-go', () => ({ default: go }));
    vi.doMock('tree-sitter-haskell', () => ({ default: haskell }));
    vi.doMock('tree-sitter-java', () => ({ default: java }));
    vi.doMock('tree-sitter-javascript', () => ({ default: javaScript }));
    vi.doMock('@tree-sitter-grammars/tree-sitter-kotlin', () => ({ default: kotlin }));
    vi.doMock('@tree-sitter-grammars/tree-sitter-lua', () => ({ default: lua }));
    vi.doMock('tree-sitter-objc', () => ({ default: objectiveC }));
    vi.doMock('tree-sitter-php', () => ({ default: { php } }));
    vi.doMock('tree-sitter-python', () => ({ default: python }));
    vi.doMock('tree-sitter-ruby', () => ({ default: ruby }));
    vi.doMock('tree-sitter-rust', () => ({ default: rust }));
    vi.doMock('tree-sitter-scala', () => ({ default: scala }));
    vi.doMock('tree-sitter-swift', () => ({ default: swift }));
    vi.doMock('tree-sitter-typescript', () => ({
      default: {
        tsx,
        typescript: typeScript,
      },
    }));

    const { loadTreeSitterBindings } = await import(MODULE_PATH);

    const first = await loadTreeSitterBindings();
    const second = await loadTreeSitterBindings();

    expect(first).toEqual({
      ParserCtor: FakeParser,
      cLanguage,
      cpp,
      csharp,
      dart,
      go,
      haskell,
      java,
      javaScript,
      kotlin,
      lua,
      objectiveC,
      php,
      python,
      ruby,
      rust,
      scala,
      swift,
      tsx,
      typeScript,
    });
    expect(second).toBe(first);
  });

  it('loads and caches only the requested language binding', async () => {
    class FakeParser {}
    const typeScript = { name: 'typescript' };

    vi.doMock('tree-sitter', () => ({ default: FakeParser }));
    vi.doMock('tree-sitter-javascript', () => {
      throw new Error('should not load javascript grammar');
    });
    vi.doMock('tree-sitter-typescript', () => ({
      default: {
        tsx: { name: 'tsx' },
        typescript: typeScript,
      },
    }));

    const { loadTreeSitterLanguageBinding } = await import(MODULE_PATH);

    const first = await loadTreeSitterLanguageBinding('typeScript');
    const second = await loadTreeSitterLanguageBinding('typeScript');

    expect(first).toEqual({
      ParserCtor: FakeParser,
      language: typeScript,
    });
    expect(second).toBe(first);
  });

  it('logs unavailable bindings once and returns null on repeated failures', async () => {
    const warning = new Error('missing native module');
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.doMock('tree-sitter', () => {
      throw warning;
    });

    const { loadTreeSitterBindings } = await import(MODULE_PATH);

    expect(await loadTreeSitterBindings()).toBeNull();
    expect(await loadTreeSitterBindings()).toBeNull();
    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn.mock.calls[0]?.[0]).toContain(
      '[CodeGraphy] Tree-sitter bindings unavailable; skipping core Tree-sitter analysis.',
    );
  });
});
