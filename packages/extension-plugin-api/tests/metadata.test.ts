import { describe, expectTypeOf, it } from 'vitest';
import type {
  IExtensionPluginDescriptorData,
  IExtensionPluginLegendEntry,
  IExtensionPluginLegendMatch,
} from '../src';

describe('Extension plugin descriptor metadata', () => {
  it('publishes static Graph View Legend Entries for files, symbols, and Edges', () => {
    expectTypeOf<IExtensionPluginDescriptorData['legendEntries']>().toEqualTypeOf<
      readonly IExtensionPluginLegendEntry[] | undefined
    >();
    expectTypeOf<IExtensionPluginLegendEntry>().toHaveProperty('id');
    expectTypeOf<IExtensionPluginLegendEntry>().toHaveProperty('label');
    expectTypeOf<IExtensionPluginLegendEntry>().toHaveProperty('pattern');
    expectTypeOf<IExtensionPluginLegendEntry>().toHaveProperty('color');
    expectTypeOf<IExtensionPluginLegendEntry>().toHaveProperty('target');
    expectTypeOf<IExtensionPluginLegendEntry>().toHaveProperty('match');
    expectTypeOf<IExtensionPluginLegendEntry>().toHaveProperty('shape2D');
    expectTypeOf<IExtensionPluginLegendEntry>().toHaveProperty('imagePath');
    expectTypeOf<IExtensionPluginLegendMatch>().toHaveProperty('nodeType');
    expectTypeOf<IExtensionPluginLegendMatch>().toHaveProperty('symbolKinds');
    expectTypeOf<IExtensionPluginLegendMatch>().toHaveProperty('symbolPluginKind');
    expectTypeOf<IExtensionPluginLegendMatch>().toHaveProperty('symbolSource');
    expectTypeOf<IExtensionPluginLegendMatch>().toHaveProperty('symbolLanguage');
    expectTypeOf<IExtensionPluginLegendMatch>().toHaveProperty('symbolFilePath');
  });
});
