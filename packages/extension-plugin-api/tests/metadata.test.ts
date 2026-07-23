import { describe, expectTypeOf, it } from 'vitest';
import type {
  IExtensionPluginDescriptorData,
  IPluginFileColorDefinition,
} from '../src';

describe('Extension plugin descriptor metadata', () => {
  it('publishes the static file color contract', () => {
    expectTypeOf<IExtensionPluginDescriptorData['fileColors']>().toEqualTypeOf<
      Record<string, string | IPluginFileColorDefinition> | undefined
    >();
    expectTypeOf<IPluginFileColorDefinition>().toHaveProperty('color');
    expectTypeOf<IPluginFileColorDefinition>().toHaveProperty('shape2D');
    expectTypeOf<IPluginFileColorDefinition>().toHaveProperty('imagePath');
  });
});
