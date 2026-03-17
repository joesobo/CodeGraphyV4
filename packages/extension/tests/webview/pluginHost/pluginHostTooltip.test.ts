import { describe, it, expect, vi } from 'vitest';
import { aggregateTooltipContent } from '../../../src/webview/pluginHost/pluginHostTooltip';
import type { TooltipProviderFn, TooltipContext } from '../../../src/webview/pluginHost/types';

const context: TooltipContext = { path: 'src/App.ts' };

describe('aggregateTooltipContent', () => {
  it('returns null when there are no providers', () => {
    expect(aggregateTooltipContent(context, [])).toBeNull();
  });

  it('returns null when all providers return null or undefined', () => {
    const providers = [
      { pluginId: 'a', fn: (() => null) as unknown as TooltipProviderFn },
      { pluginId: 'b', fn: (() => undefined) as unknown as TooltipProviderFn },
    ];

    expect(aggregateTooltipContent(context, providers)).toBeNull();
  });

  it('returns null when providers return objects without sections', () => {
    const providers = [
      { pluginId: 'a', fn: (() => ({})) as unknown as TooltipProviderFn },
    ];

    expect(aggregateTooltipContent(context, providers)).toBeNull();
  });

  it('aggregates sections from multiple providers', () => {
    const providers = [
      { pluginId: 'a', fn: (() => ({ sections: [{ title: 'A', content: 'a-content' }] })) as unknown as TooltipProviderFn },
      { pluginId: 'b', fn: (() => ({ sections: [{ title: 'B', content: 'b-content' }] })) as unknown as TooltipProviderFn },
    ];

    expect(aggregateTooltipContent(context, providers)).toEqual({
      sections: [
        { title: 'A', content: 'a-content' },
        { title: 'B', content: 'b-content' },
      ],
    });
  });

  it('catches errors from providers and continues with remaining providers', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const providers = [
      { pluginId: 'failing', fn: (() => { throw new Error('boom'); }) as unknown as TooltipProviderFn },
      { pluginId: 'ok', fn: (() => ({ sections: [{ title: 'OK', content: 'works' }] })) as unknown as TooltipProviderFn },
    ];

    const result = aggregateTooltipContent(context, providers);

    expect(result).toEqual({ sections: [{ title: 'OK', content: 'works' }] });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Tooltip provider error'), expect.any(Error));
    errorSpy.mockRestore();
  });

  it('skips providers that return content without sections property', () => {
    const providers = [
      { pluginId: 'a', fn: (() => ({ otherProp: 'value' })) as unknown as TooltipProviderFn },
      { pluginId: 'b', fn: (() => ({ sections: [{ title: 'B', content: 'ok' }] })) as unknown as TooltipProviderFn },
    ];

    expect(aggregateTooltipContent(context, providers)).toEqual({
      sections: [{ title: 'B', content: 'ok' }],
    });
  });

  it('returns content with multiple sections from a single provider', () => {
    const providers = [
      {
        pluginId: 'a',
        fn: (() => ({
          sections: [
            { title: 'Section1', content: 'content1' },
            { title: 'Section2', content: 'content2' },
          ],
        })) as unknown as TooltipProviderFn,
      },
    ];

    expect(aggregateTooltipContent(context, providers)).toEqual({
      sections: [
        { title: 'Section1', content: 'content1' },
        { title: 'Section2', content: 'content2' },
      ],
    });
  });
});
