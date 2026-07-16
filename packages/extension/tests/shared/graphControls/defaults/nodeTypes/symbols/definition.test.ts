import { describe, expect, it } from 'vitest';
import {
  createGodotSymbolNodeType,
  createSymbolNodeType,
} from '../../../../../../src/shared/graphControls/defaults/nodeTypes/symbols/definition';

describe('shared/graphControls/defaults/nodeTypes/symbols/definition', () => {
  it('adds the shared symbol defaults', () => {
    expect(createSymbolNodeType({ id: 'symbol:test', label: 'Test', defaultColor: '#123456' }))
      .toEqual({
        id: 'symbol:test',
        label: 'Test',
        defaultColor: '#123456',
        defaultVisible: false,
        parentId: 'symbol',
      });
  });

  it('adds the Godot matching fields from one plugin kind', () => {
    expect(createGodotSymbolNodeType({
      id: 'symbol:test',
      label: 'Test',
      defaultColor: '#123456',
      pluginKind: 'scene',
    })).toMatchObject({
      pluginName: 'Godot',
      matchSymbolKinds: ['scene'],
      matchSymbolPluginKind: 'scene',
      matchSymbolSource: 'codegraphy.gdscript',
    });
  });
});
