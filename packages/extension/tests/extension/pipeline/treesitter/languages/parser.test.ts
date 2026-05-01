import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadTreeSitterBindings } = vi.hoisted(() => ({
  loadTreeSitterBindings: vi.fn(),
}));

vi.mock(
  '../../../../../src/extension/pipeline/plugins/treesitter/runtime/languages/load',
  () => ({
    loadTreeSitterBindings,
  }),
);

import {
  createTreeSitterParser,
  createTreeSitterRuntime,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/languages/parser';

class MockParser {
  setLanguage = vi.fn();
}

describe('pipeline/plugins/treesitter/runtime/languages/parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a configured parser for supported files when bindings are available', async () => {
    loadTreeSitterBindings.mockResolvedValue({
      ParserCtor: MockParser,
      typeScript: { id: 'typescript' },
    });

    const parser = await createTreeSitterParser('/workspace/src/app.ts');
    const configuredParser = parser as unknown as MockParser;

    expect(parser).toBeInstanceOf(MockParser);
    expect(configuredParser.setLanguage).toHaveBeenCalledWith({ id: 'typescript' });
  });

  it('returns configured parsers for C and C++ files', async () => {
    loadTreeSitterBindings.mockResolvedValue({
      ParserCtor: MockParser,
      cLanguage: { id: 'c' },
      cpp: { id: 'cpp' },
    });

    const cRuntime = await createTreeSitterRuntime('/workspace/src/main.c');
    const cppRuntime = await createTreeSitterRuntime('/workspace/src/main.cpp');

    expect(cRuntime?.languageKind).toBe('c');
    expect((cRuntime?.parser as unknown as MockParser).setLanguage).toHaveBeenCalledWith({ id: 'c' });
    expect(cppRuntime?.languageKind).toBe('cpp');
    expect((cppRuntime?.parser as unknown as MockParser).setLanguage).toHaveBeenCalledWith({ id: 'cpp' });
  });

  it('returns configured parsers for Kotlin files', async () => {
    loadTreeSitterBindings.mockResolvedValue({
      ParserCtor: MockParser,
      kotlin: { id: 'kotlin' },
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
    loadTreeSitterBindings.mockResolvedValue({
      ParserCtor: MockParser,
      php: { id: 'php' },
    });

    const phpRuntime = await createTreeSitterRuntime('/workspace/src/App.php');

    expect(phpRuntime?.languageKind).toBe('php');
    expect((phpRuntime?.parser as unknown as MockParser).setLanguage).toHaveBeenCalledWith({
      id: 'php',
    });
  });

  it('returns configured parsers for Ruby files', async () => {
    loadTreeSitterBindings.mockResolvedValue({
      ParserCtor: MockParser,
      ruby: { id: 'ruby' },
    });

    const rubyRuntime = await createTreeSitterRuntime('/workspace/lib/app/runner.rb');

    expect(rubyRuntime?.languageKind).toBe('ruby');
    expect((rubyRuntime?.parser as unknown as MockParser).setLanguage).toHaveBeenCalledWith({
      id: 'ruby',
    });
  });

  it('returns configured parsers for Haskell files', async () => {
    loadTreeSitterBindings.mockResolvedValue({
      ParserCtor: MockParser,
      haskell: { id: 'haskell' },
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
    loadTreeSitterBindings.mockResolvedValue({
      ParserCtor: MockParser,
      lua: { id: 'lua' },
    });

    const luaRuntime = await createTreeSitterRuntime('/workspace/src/app.lua');

    expect(luaRuntime?.languageKind).toBe('lua');
    expect((luaRuntime?.parser as unknown as MockParser).setLanguage).toHaveBeenCalledWith({
      id: 'lua',
    });
  });

  it('returns a runtime with the parser and language kind for supported files', async () => {
    loadTreeSitterBindings.mockResolvedValue({
      ParserCtor: MockParser,
      javaScript: { id: 'javascript' },
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
    loadTreeSitterBindings.mockResolvedValue(null);

    await expect(createTreeSitterParser('/workspace/src/app.ts')).resolves.toBeNull();
    await expect(createTreeSitterRuntime('/workspace/src/app.ts')).resolves.toBeNull();
  });

  it('returns null for unsupported files without loading bindings', async () => {
    await expect(createTreeSitterParser('/workspace/README.md')).resolves.toBeNull();
    await expect(createTreeSitterRuntime('/workspace/README.md')).resolves.toBeNull();

    expect(loadTreeSitterBindings).not.toHaveBeenCalled();
  });
});
