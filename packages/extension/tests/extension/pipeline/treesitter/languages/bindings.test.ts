import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MODULE_PATH =
  '../../../../../src/extension/pipeline/plugins/treesitter/runtime/languages/load';

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
    vi.unmock('tree-sitter-go');
    vi.unmock('tree-sitter-java');
    vi.unmock('tree-sitter-javascript');
    vi.unmock('@tree-sitter-grammars/tree-sitter-kotlin');
    vi.unmock('tree-sitter-php');
    vi.unmock('tree-sitter-python');
    vi.unmock('tree-sitter-ruby');
    vi.unmock('tree-sitter-rust');
    vi.unmock('tree-sitter-typescript');
  });

  it('loads and caches tree-sitter bindings from the language modules', async () => {
    class FakeParser {}
    const cLanguage = { name: 'c' };
    const cpp = { name: 'cpp' };
    const csharp = { name: 'csharp' };
    const go = { name: 'go' };
    const java = { name: 'java' };
    const javaScript = { name: 'javascript' };
    const kotlin = { name: 'kotlin' };
    const php = { name: 'php' };
    const python = { name: 'python' };
    const ruby = { name: 'ruby' };
    const rust = { name: 'rust' };
    const tsx = { name: 'tsx' };
    const typeScript = { name: 'typescript' };

    vi.doMock('tree-sitter', () => ({ default: FakeParser }));
    vi.doMock('tree-sitter-c', () => ({ default: cLanguage }));
    vi.doMock('tree-sitter-cpp', () => ({ default: cpp }));
    vi.doMock('tree-sitter-c-sharp', () => ({ default: csharp }));
    vi.doMock('tree-sitter-go', () => ({ default: go }));
    vi.doMock('tree-sitter-java', () => ({ default: java }));
    vi.doMock('tree-sitter-javascript', () => ({ default: javaScript }));
    vi.doMock('@tree-sitter-grammars/tree-sitter-kotlin', () => ({ default: kotlin }));
    vi.doMock('tree-sitter-php', () => ({ default: { php } }));
    vi.doMock('tree-sitter-python', () => ({ default: python }));
    vi.doMock('tree-sitter-ruby', () => ({ default: ruby }));
    vi.doMock('tree-sitter-rust', () => ({ default: rust }));
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
      go,
      java,
      javaScript,
      kotlin,
      php,
      python,
      ruby,
      rust,
      tsx,
      typeScript,
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
