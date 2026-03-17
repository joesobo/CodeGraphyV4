/**
 * Tests targeting surviving mutants in pluginHostTooltip.ts:
 * - L19:11 ConditionalExpression: true (content?.sections -> true, always pushes)
 * - L19:11 OptionalChaining mutation (content?.sections -> content.sections, throws on null)
 */
import { describe, it, expect } from 'vitest';
import { aggregateTooltipContent } from '../../../src/webview/pluginHost/pluginHostTooltip';
import type { TooltipProviderFn, TooltipContext } from '../../../src/webview/pluginHost/types';

const context: TooltipContext = { path: 'src/App.ts' };

describe('aggregateTooltipContent (mutation targets)', () => {
  it('does not include results from providers that return null', () => {
    // L19: if `content?.sections` is mutated to `true`, we'd try to spread
    // `true` which would fail or produce unexpected results.
    // If optional chaining is removed, accessing `.sections` on null would throw.
    const providers = [
      {
        pluginId: 'null-provider',
        fn: (() => null) as unknown as TooltipProviderFn,
      },
      {
        pluginId: 'valid-provider',
        fn: (() => ({
          sections: [{ title: 'Valid', content: 'valid content' }],
        })) as unknown as TooltipProviderFn,
      },
    ];

    const result = aggregateTooltipContent(context, providers);

    // Should only have the valid provider's section, not anything from null
    expect(result).toEqual({
      sections: [{ title: 'Valid', content: 'valid content' }],
    });
    expect(result!.sections).toHaveLength(1);
  });

  it('does not include results from providers that return undefined', () => {
    const providers = [
      {
        pluginId: 'undefined-provider',
        fn: (() => undefined) as unknown as TooltipProviderFn,
      },
    ];

    const result = aggregateTooltipContent(context, providers);
    expect(result).toBeNull();
  });

  it('does not include results from providers that return object without sections', () => {
    // If `content?.sections` is mutated to `true`, sections.push(...true)
    // would either throw or produce garbage
    const providers = [
      {
        pluginId: 'no-sections',
        fn: (() => ({ data: 'something' })) as unknown as TooltipProviderFn,
      },
      {
        pluginId: 'has-sections',
        fn: (() => ({
          sections: [{ title: 'Real', content: 'real content' }],
        })) as unknown as TooltipProviderFn,
      },
    ];

    const result = aggregateTooltipContent(context, providers);

    expect(result).toEqual({
      sections: [{ title: 'Real', content: 'real content' }],
    });
    // Verify exact count - no extra items from the provider without sections
    expect(result!.sections).toHaveLength(1);
  });

  it('correctly aggregates sections and ignores providers returning empty sections array', () => {
    const providers = [
      {
        pluginId: 'empty-sections',
        fn: (() => ({ sections: [] })) as unknown as TooltipProviderFn,
      },
      {
        pluginId: 'one-section',
        fn: (() => ({
          sections: [{ title: 'One', content: 'one' }],
        })) as unknown as TooltipProviderFn,
      },
    ];

    const result = aggregateTooltipContent(context, providers);

    expect(result).toEqual({
      sections: [{ title: 'One', content: 'one' }],
    });
  });

  it('returns null when single provider returns null content', () => {
    // Tests the optional chaining: content?.sections on null content
    const providers = [
      {
        pluginId: 'null-only',
        fn: (() => null) as unknown as TooltipProviderFn,
      },
    ];

    const result = aggregateTooltipContent(context, providers);
    expect(result).toBeNull();
  });

  it('handles provider returning content with sections property set to undefined', () => {
    const providers = [
      {
        pluginId: 'undefined-sections',
        fn: (() => ({ sections: undefined })) as unknown as TooltipProviderFn,
      },
    ];

    const result = aggregateTooltipContent(context, providers);
    expect(result).toBeNull();
  });
});
