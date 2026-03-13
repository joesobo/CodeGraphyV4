import { describe, expect, it, vi } from 'vitest';
import { detect } from '../src/rules/wikilink';

describe('Markdown wikilink rule', () => {
  function createResolver() {
    return {
      resolve: vi.fn((target: string) => `/resolved/${target}.md`),
    };
  }

  it('parses [[target|alias]] and preserves alias in the emitted specifier', () => {
    const resolver = createResolver();
    const connections = detect(
      'See [[Note Name|Alias Text]] for details.',
      '/workspace/Current.md',
      { resolver: resolver as never },
    );

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('[[Note Name|Alias Text]]');
    expect(connections[0].resolvedPath).toBe('/resolved/Note Name.md');
    expect(connections[0].ruleId).toBe('wikilink');
    expect(connections[0].type).toBe('static');
  });

  it('strips heading fragments before path resolution', () => {
    const resolver = createResolver();
    const connections = detect(
      '[[Architecture#Overview|System Architecture]]',
      '/workspace/Current.md',
      { resolver: resolver as never },
    );

    expect(resolver.resolve).toHaveBeenCalledWith('Architecture', '/workspace/Current.md');
    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('[[Architecture|System Architecture]]');
  });

  it('ignores wikilinks inside inline code and fenced code blocks', () => {
    const resolver = createResolver();
    const content = [
      'Do not parse `[[InlineIgnored]]`.',
      '```',
      '[[FenceIgnored]]',
      '```',
      'Keep [[Real Note]].',
    ].join('\n');

    const connections = detect(content, '/workspace/Current.md', {
      resolver: resolver as never,
    });

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('[[Real Note]]');
    expect(resolver.resolve).toHaveBeenCalledTimes(1);
    expect(resolver.resolve).toHaveBeenCalledWith('Real Note', '/workspace/Current.md');
  });

  it('ignores heading-only wikilinks that have no target', () => {
    const resolver = createResolver();
    const connections = detect(
      '[[#OnlyHeading]] and [[Real Note]]',
      '/workspace/Current.md',
      { resolver: resolver as never },
    );

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('[[Real Note]]');
    expect(resolver.resolve).toHaveBeenCalledTimes(1);
    expect(resolver.resolve).toHaveBeenCalledWith('Real Note', '/workspace/Current.md');
  });
});
