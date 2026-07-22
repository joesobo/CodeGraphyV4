import { describe, expect, it } from 'vitest';
import { createGodotAssetNodeTypes } from '../../../../../../src/shared/graphControls/defaults/nodeTypes/symbols/godotAssets';

describe('shared/graphControls/defaults/nodeTypes/symbols/godotAssets', () => {
  it('creates the Godot asset types', () => {
    expect(createGodotAssetNodeTypes().map(({ matchSymbolPluginKind }) => matchSymbolPluginKind))
      .toEqual(['scene', 'resource', 'autoload']);
  });
});
