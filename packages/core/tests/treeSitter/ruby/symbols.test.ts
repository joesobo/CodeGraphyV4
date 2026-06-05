import { describe, expect, it } from 'vitest';
import {
  handleRubyClass,
  handleRubyMethod,
  handleRubyModule,
} from '../../../src/treeSitter/runtime/analyzeRuby/symbols';

function node(
  type: string,
  text = '',
  fields: Record<string, unknown> = {},
  parent?: unknown,
): never {
  return {
    type,
    text,
    parent,
    startPosition: { row: 0, column: 0 },
    endPosition: { row: 0, column: text.length },
    childForFieldName: (fieldName: string) => fields[fieldName] ?? null,
  } as never;
}

function superclass(constants: unknown[]): never {
  return {
    descendantsOfType: (type: string) => (type === 'constant' ? constants : []),
  } as never;
}

describe('treeSitter/analyzeRuby/symbols', () => {
  it('adds named Ruby module and class symbols with inherited base relations', () => {
    const symbols: unknown[] = [];
    const relations: unknown[] = [];

    handleRubyModule(node('module', 'module App', {
      name: node('constant', 'App'),
    }), '/workspace/app.rb', symbols as never);
    handleRubyClass(node('class', 'class Runner', {
      name: node('constant', 'Runner'),
      superclass: superclass([node('constant', 'BaseRunner')]),
    }), '/workspace/app.rb', relations as never, symbols as never, new Map([
      ['BaseRunner', { specifier: '../base', resolvedPath: '/workspace/base.rb' }],
    ]) as never, true);

    expect(symbols).toEqual([
      expect.objectContaining({ filePath: '/workspace/app.rb', kind: 'module', name: 'App' }),
      expect.objectContaining({ filePath: '/workspace/app.rb', kind: 'class', name: 'Runner' }),
    ]);
    expect(relations).toEqual([
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'BaseRunner',
        resolvedPath: '/workspace/base.rb',
        toFilePath: '/workspace/base.rb',
      }),
    ]);
  });

  it('skips unnamed Ruby symbols and classes without a superclass', () => {
    const symbols: unknown[] = [];
    const relations: unknown[] = [];

    handleRubyModule(node('module'), '/workspace/app.rb', symbols as never);
    handleRubyClass(node('class', '', {
      name: node('constant', 'Runner'),
      superclass: superclass([]),
    }), '/workspace/app.rb', relations as never, symbols as never, new Map(), true);

    expect(symbols).toEqual([
      expect.objectContaining({ kind: 'class', name: 'Runner' }),
    ]);
    expect(relations).toEqual([]);
  });

  it('classifies Ruby methods by whether they are nested inside a class', () => {
    const symbols: unknown[] = [];
    const classNode = node('class');
    const singletonClassNode = node('singleton_class');

    expect(handleRubyMethod(node('method', 'def run', {
      name: node('identifier', 'run'),
    }, classNode), '/workspace/app.rb', symbols as never)).toEqual({ skipChildren: true });
    expect(handleRubyMethod(node('method', 'def configure', {
      name: node('identifier', 'configure'),
    }, singletonClassNode), '/workspace/app.rb', symbols as never)).toEqual({ skipChildren: true });
    handleRubyMethod(node('method', 'def boot', {
      name: node('identifier', 'boot'),
    }), '/workspace/app.rb', symbols as never);
    handleRubyMethod(node('method'), '/workspace/app.rb', symbols as never);

    expect(symbols).toEqual([
      expect.objectContaining({ kind: 'method', name: 'run' }),
      expect.objectContaining({ kind: 'method', name: 'configure' }),
      expect.objectContaining({ kind: 'function', name: 'boot' }),
    ]);
  });
});
