import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadTreeSitterLanguageBinding } = vi.hoisted(() => ({
  loadTreeSitterLanguageBinding: vi.fn(),
}));

vi.mock(
  '../../../src/treeSitter/runtime/languages/load',
  () => ({
    loadTreeSitterLanguageBinding,
  }),
);

import {
  createTreeSitterParser,
  createTreeSitterRuntime,
} from '../../../src/treeSitter/runtime/languages/parser';

class MockParser {
  setLanguage = vi.fn();
}

describe('pipeline/plugins/treesitter/runtime/languages/parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a configured parser for supported files when bindings are available', async () => {
    loadTreeSitterLanguageBinding.mockResolvedValue({
      ParserCtor: MockParser,
      language: { id: 'typescript' },
    });

    const parser = await createTreeSitterParser('/workspace/src/app.ts');
    const configuredParser = parser as unknown as MockParser;

    expect(parser).toBeInstanceOf(MockParser);
    expect(configuredParser.setLanguage).toHaveBeenCalledWith({ id: 'typescript' });
  });

  it('returns configured parsers for C and C++ files', async () => {
    loadTreeSitterLanguageBinding
      .mockResolvedValueOnce({
        ParserCtor: MockParser,
        language: { id: 'c' },
      })
      .mockResolvedValueOnce({
        ParserCtor: MockParser,
        language: { id: 'cpp' },
      });

    const cRuntime = await createTreeSitterRuntime('/workspace/src/main.c');
    const cppRuntime = await createTreeSitterRuntime('/workspace/src/main.cpp');

    expect(loadTreeSitterLanguageBinding).toHaveBeenNthCalledWith(1, 'cLanguage');
    expect(loadTreeSitterLanguageBinding).toHaveBeenNthCalledWith(2, 'cpp');
    expect(cRuntime?.languageKind).toBe('c');
    expect((cRuntime?.parser as unknown as MockParser).setLanguage).toHaveBeenCalledWith({ id: 'c' });
    expect(cppRuntime?.languageKind).toBe('cpp');
    expect((cppRuntime?.parser as unknown as MockParser).setLanguage).toHaveBeenCalledWith({ id: 'cpp' });
  });

  it('returns configured parsers for Kotlin files', async () => {
    loadTreeSitterLanguageBinding.mockResolvedValue({
      ParserCtor: MockParser,
      language: { id: 'kotlin' },
    });

    const kotlinRuntime = await createTreeSitterRuntime('/workspace/src/App.kt');
    const kotlinScriptRuntime = await createTreeSitterRuntime('/workspace/src/App.kts');

    expect(kotlinRuntime?.languageKind).toBe('kotlin');
    expect((kotlinRuntime?.parser as unknown as MockParser).setLanguage).toHaveBeenCalledWith({
      id: 'kotlin',
    });
    expect(kotlinScriptRuntime?.languageKind).toBe('kotlin');
    expect(
      (kotlinScriptRuntime?.parser as unknown as MockParser).setLanguage,
    ).toHaveBeenCalledWith({ id: 'kotlin' });
  });

  it('returns configured parsers for PHP files', async () => {
    loadTreeSitterLanguageBinding.mockResolvedValue({
      ParserCtor: MockParser,
      language: { id: 'php' },
    });

    const phpRuntime = await createTreeSitterRuntime('/workspace/src/App.php');

    expect(phpRuntime?.languageKind).toBe('php');
    expect((phpRuntime?.parser as unknown as MockParser).setLanguage).toHaveBeenCalledWith({
      id: 'php',
    });
  });

  it('returns configured parsers for Dart files', async () => {
    loadTreeSitterLanguageBinding.mockResolvedValue({
      ParserCtor: MockParser,
      language: { id: 'dart' },
    });

    const dartRuntime = await createTreeSitterRuntime('/workspace/lib/app/runner.dart');

    expect(dartRuntime?.languageKind).toBe('dart');
    expect((dartRuntime?.parser as unknown as MockParser).setLanguage).toHaveBeenCalledWith({
      id: 'dart',
    });
  });

  it('returns configured parsers for Ruby files', async () => {
    loadTreeSitterLanguageBinding.mockResolvedValue({
      ParserCtor: MockParser,
      language: { id: 'ruby' },
    });

    const rubyRuntime = await createTreeSitterRuntime('/workspace/lib/app/runner.rb');

    expect(rubyRuntime?.languageKind).toBe('ruby');
    expect((rubyRuntime?.parser as unknown as MockParser).setLanguage).toHaveBeenCalledWith({
      id: 'ruby',
    });
  });

  it('returns configured parsers for Haskell files', async () => {
    loadTreeSitterLanguageBinding.mockResolvedValue({
      ParserCtor: MockParser,
      language: { id: 'haskell' },
    });

    const haskellRuntime = await createTreeSitterRuntime('/workspace/src/App.hs');
    const literateHaskellRuntime = await createTreeSitterRuntime('/workspace/src/App.lhs');

    expect(haskellRuntime?.languageKind).toBe('haskell');
    expect((haskellRuntime?.parser as unknown as MockParser).setLanguage).toHaveBeenCalledWith({
      id: 'haskell',
    });
    expect(literateHaskellRuntime?.languageKind).toBe('haskell');
    expect(
      (literateHaskellRuntime?.parser as unknown as MockParser).setLanguage,
    ).toHaveBeenCalledWith({ id: 'haskell' });
  });

  it('returns configured parsers for Lua files', async () => {
    loadTreeSitterLanguageBinding.mockResolvedValue({
      ParserCtor: MockParser,
      language: { id: 'lua' },
    });

    const luaRuntime = await createTreeSitterRuntime('/workspace/src/app.lua');

    expect(luaRuntime?.languageKind).toBe('lua');
    expect((luaRuntime?.parser as unknown as MockParser).setLanguage).toHaveBeenCalledWith({
      id: 'lua',
    });
  });

  it('returns configured parsers for Swift files', async () => {
    loadTreeSitterLanguageBinding.mockResolvedValue({
      ParserCtor: MockParser,
      language: { id: 'swift' },
    });

    const swiftRuntime = await createTreeSitterRuntime('/workspace/Sources/App/Runner.swift');

    expect(swiftRuntime?.languageKind).toBe('swift');
    expect((swiftRuntime?.parser as unknown as MockParser).setLanguage).toHaveBeenCalledWith({
      id: 'swift',
    });
  });

  it('returns a runtime with the parser and language kind for supported files', async () => {
    loadTreeSitterLanguageBinding.mockResolvedValue({
      ParserCtor: MockParser,
      language: { id: 'javascript' },
    });

    const runtime = await createTreeSitterRuntime('/workspace/src/app.js');
    const configuredParser = runtime?.parser as unknown as MockParser;

    expect(runtime?.languageKind).toBe('javascript');
    expect(runtime?.parser).toBeInstanceOf(MockParser);
    expect(configuredParser.setLanguage).toHaveBeenCalledWith({
      id: 'javascript',
    });
  });

  it('returns null for supported files when bindings are unavailable', async () => {
    loadTreeSitterLanguageBinding.mockResolvedValue(null);

    await expect(createTreeSitterParser('/workspace/src/app.ts')).resolves.toBeNull();
    await expect(createTreeSitterRuntime('/workspace/src/app.ts')).resolves.toBeNull();
  });

  it('returns null for unsupported files without loading bindings', async () => {
    await expect(createTreeSitterParser('/workspace/README.md')).resolves.toBeNull();
    await expect(createTreeSitterRuntime('/workspace/README.md')).resolves.toBeNull();

    expect(loadTreeSitterLanguageBinding).not.toHaveBeenCalled();
  });
});
