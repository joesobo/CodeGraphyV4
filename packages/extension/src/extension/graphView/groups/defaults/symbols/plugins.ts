import { mdiAlphaCBoxOutline } from '@mdi/js';
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
];
