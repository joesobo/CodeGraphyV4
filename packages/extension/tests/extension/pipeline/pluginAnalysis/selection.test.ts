import { describe, expect, it } from 'vitest';
import { listActiveAnalysisPluginIds } from '../../../../src/extension/pipeline/pluginAnalysis/selection';

function registryWith(...ids: Array<string | undefined>) {
  return {
    list: () => ids.map(id => ({ plugin: { id } })),
  };
}

describe('pipeline plugin analysis selection', () => {
  it('selects valid registered plugin ids when no explicit ids are supplied', () => {
    expect(listActiveAnalysisPluginIds(
      registryWith('plugin.alpha', '', undefined, 'plugin.beta') as never,
      undefined,
      new Set(),
    )).toEqual(['plugin.alpha', 'plugin.beta']);
  });

  it('preserves an explicit analysis plugin selection', () => {
    expect(listActiveAnalysisPluginIds(
      registryWith('plugin.registered') as never,
      ['plugin.requested'],
      new Set(),
    )).toEqual(['plugin.requested']);
  });

  it('excludes disabled plugins from registered and explicit selections', () => {
    const disabled = new Set(['plugin.disabled']);

    expect(listActiveAnalysisPluginIds(
      registryWith('plugin.active', 'plugin.disabled') as never,
      undefined,
      disabled,
    )).toEqual(['plugin.active']);
    expect(listActiveAnalysisPluginIds(
      registryWith() as never,
      ['plugin.active', 'plugin.disabled'],
      disabled,
    )).toEqual(['plugin.active']);
  });
});
