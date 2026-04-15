import { describe, expect, it, vi } from 'vitest';
import { detect } from '../src/sources/wikilink';

describe('Markdown wikilink rule', () => {
  function createResolver() {
    return {
      resolve: vi.fn((target: string) => `/resolved/${target}.md`),
    };
  }

  describe('alias syntax', () => {
    it('parses the target from [[target|alias]] notation', () => {
      const resolver = createResolver();

      const connections = detect(
        'See [[docs/Note Name|Alias Text]] for details.',
        '/workspace/Current.md',
        { resolver: resolver as never },
      );

      expect(connections).toHaveLength(1);
      expect(connections[0].resolvedPath).toBe('/resolved/docs/Note Name.md');
    });

    it('preserves the full alias syntax in the emitted specifier', () => {
      const resolver = createResolver();

      const connections = detect(
        'See [[docs/Note Name|Alias Text]] for details.',
        '/workspace/Current.md',
        { resolver: resolver as never },
      );

      expect(connections).toHaveLength(1);
      expect(connections[0].specifier).toBe('[[docs/Note Name|Alias Text]]');
    });
  });

  describe('connection metadata', () => {
    it('sets sourceId to wikilink', () => {
      const resolver = createResolver();

      const connections = detect(
        'See [[docs/Note Name|Alias Text]] for details.',
        '/workspace/Current.md',
        { resolver: resolver as never },
      );

      expect(connections).toHaveLength(1);
      expect(connections[0].kind).toBe('reference');
      expect(connections[0].sourceId).toBe('wikilink');
    });

    it('sets type to static', () => {
      const resolver = createResolver();

      const connections = detect(
        'See [[docs/Note Name|Alias Text]] for details.',
        '/workspace/Current.md',
        { resolver: resolver as never },
      );

      expect(connections).toHaveLength(1);
      expect(connections[0].type).toBe('static');
    });
  });

  it('strips heading fragments before path resolution', () => {
    const resolver = createResolver();

    const connections = detect(
      '[[docs/Architecture#Overview|System Architecture]]',
      '/workspace/Current.md',
      { resolver: resolver as never },
    );

    expect(resolver.resolve).toHaveBeenCalledWith('docs/Architecture', '/workspace/Current.md');
    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('[[docs/Architecture|System Architecture]]');
  });

  describe('code block exclusions', () => {
    it('ignores wikilinks inside inline code', () => {
      const resolver = createResolver();
      const content = [
        'Do not parse `[[InlineIgnored]]`.',
        'Keep [[docs/Real Note]].',
      ].join('\n');

      const connections = detect(content, '/workspace/Current.md', {
        resolver: resolver as never,
      });

      expect(connections).toHaveLength(1);
      expect(connections[0].specifier).toBe('[[docs/Real Note]]');
    });

    it('ignores wikilinks inside fenced code blocks', () => {
      const resolver = createResolver();
      const content = [
        '```',
        '[[FenceIgnored]]',
        '```',
        'Keep [[docs/Real Note]].',
      ].join('\n');

      const connections = detect(content, '/workspace/Current.md', {
        resolver: resolver as never,
      });

      expect(connections).toHaveLength(1);
      expect(connections[0].specifier).toBe('[[docs/Real Note]]');
    });

    it('does not call the resolver for excluded wikilinks', () => {
      const resolver = createResolver();
      const content = [
        'Do not parse `[[InlineIgnored]]`.',
        '```',
        '[[FenceIgnored]]',
        '```',
        'Keep [[docs/Real Note]].',
      ].join('\n');

      detect(content, '/workspace/Current.md', {
        resolver: resolver as never,
      });

      expect(resolver.resolve).toHaveBeenCalledTimes(1);
      expect(resolver.resolve).toHaveBeenCalledWith('docs/Real Note', '/workspace/Current.md');
    });
  });

  it('ignores heading-only wikilinks that have no target', () => {
    const resolver = createResolver();

    const connections = detect(
      '[[#OnlyHeading]] and [[docs/Real Note]]',
      '/workspace/Current.md',
      { resolver: resolver as never },
    );

    expect(connections).toHaveLength(1);
    expect(connections[0].specifier).toBe('[[docs/Real Note]]');
    expect(resolver.resolve).toHaveBeenCalledTimes(1);
    expect(resolver.resolve).toHaveBeenCalledWith('docs/Real Note', '/workspace/Current.md');
  });
});
