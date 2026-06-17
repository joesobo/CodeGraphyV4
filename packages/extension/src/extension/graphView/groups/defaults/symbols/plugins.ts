import { mdiAlphaCBoxOutline, mdiPuzzleOutline, mdiUnity } from '@mdi/js';
import { createMaterialSymbolIconDataUrl } from './icons';
import type { SymbolDefaultGroup } from './model';

export const PLUGIN_SYMBOL_GROUPS: SymbolDefaultGroup[] = [
  {
    id: 'plugin:codegraphy.gdscript:symbol:godot-class-name',
    displayLabel: 'class_name',
    color: '#478CBF',
    imageUrl: createMaterialSymbolIconDataUrl(mdiAlphaCBoxOutline),
    matchNodeType: 'symbol',
    matchSymbolKind: 'class',
    matchSymbolPluginKind: 'godot-class-name',
    matchSymbolSource: 'codegraphy.gdscript',
    matchSymbolLanguage: 'gdscript',
    matchSymbolFilePath: '**/*.gd',
    pluginId: 'codegraphy.gdscript',
    pluginName: 'Godot',
  },
  {
    id: 'plugin:codegraphy.unity:symbol:game-object',
    displayLabel: 'GameObject',
    color: '#0EA5E9',
    imageUrl: createMaterialSymbolIconDataUrl(mdiUnity),
    matchNodeType: 'symbol',
    matchSymbolKind: 'game-object',
    matchSymbolPluginKind: 'game-object',
    matchSymbolSource: 'codegraphy.unity',
    matchSymbolLanguage: 'unity',
    pluginId: 'codegraphy.unity',
    pluginName: 'Unity',
  },
  {
    id: 'plugin:codegraphy.unity:symbol:component',
    displayLabel: 'Component',
    color: '#22C55E',
    imageUrl: createMaterialSymbolIconDataUrl(mdiPuzzleOutline),
    matchNodeType: 'symbol',
    matchSymbolKind: 'component',
    matchSymbolPluginKind: 'component',
    matchSymbolSource: 'codegraphy.unity',
    matchSymbolLanguage: 'unity',
    pluginId: 'codegraphy.unity',
    pluginName: 'Unity',
  },
];
