/**
 * Tests targeting surviving mutants in pluginHostTooltip.ts:
 * - L19:11 ConditionalExpression: true (content?.sections -> true, always pushes)
 * - L19:11 OptionalChaining mutation (content?.sections -> content.sections, throws on null)
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { aggregateTooltipContent } from '../../../src/webview/pluginHost/pluginHostTooltip';
import type { TooltipProviderFn, TooltipContext } from '../../../src/webview/pluginHost/types';

const context: TooltipContext = { path: 'src/App.ts' };

describe('aggregateTooltipContent (mutation targets)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not log an error when a provider returns null', () => {
    // L19:11 ConditionalExpression: true — if guard becomes `true`, then
    // `sections.push(...null.sections)` throws, which is caught by the
    // try/catch and logged to console.error. With the correct guard,
    // the null return is silently skipped.
    // L19:11 OptionalChaining — if `content?.sections` becomes `content.sections`,
    // accessing `.sections` on null throws TypeError, same catch path.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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

    expect(result).toEqual({
      sections: [{ title: 'Valid', content: 'valid content' }],
    });
    expect(result!.sections).toHaveLength(1);
    // The null-returning provider must NOT trigger the error handler
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('does not log an error when a single provider returns null', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const providers = [
      {
        pluginId: 'null-only',
        fn: (() => null) as unknown as TooltipProviderFn,
      },
    ];

    const result = aggregateTooltipContent(context, providers);

    expect(result).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('does not log an error when a provider returns undefined', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const providers = [
      {
        pluginId: 'undefined-provider',
        fn: (() => undefined) as unknown as TooltipProviderFn,
      },
    ];

    const result = aggregateTooltipContent(context, providers);
    expect(result).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('does not log an error for a provider returning object without sections', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
    expect(result!.sections).toHaveLength(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
