import {
  mdiAccessPoint,
  mdiAlphaCBoxOutline,
  mdiCogOutline,
  mdiExport,
  mdiFileDocumentOutline,
  mdiFileTreeOutline,
  mdiPackageVariantClosed,
  mdiPuzzleOutline,
  mdiUnity,
} from '@mdi/js';
import { createMaterialSymbolIconDataUrl } from './icons';
import type { SymbolDefaultGroup } from './model';

interface GodotSymbolGroupOptions {
  color: string;
  displayLabel: string;
  icon: string;
  id: string;
  kind: string;
  language?: string;
  matchNodeType?: SymbolDefaultGroup['matchNodeType'];
  pluginKind: string;
  symbolFilePath?: string;
}

function createGodotSymbolGroup({
  color,
  displayLabel,
  icon,
  id,
  kind,
  language,
  matchNodeType = 'symbol',
  pluginKind,
  symbolFilePath,
}: GodotSymbolGroupOptions): SymbolDefaultGroup {
  return {
    id: `plugin:codegraphy.gdscript:symbol:${id}`,
    displayLabel,
    color,
    imageUrl: createMaterialSymbolIconDataUrl(icon),
    matchNodeType,
    matchSymbolKind: kind,
    matchSymbolPluginKind: pluginKind,
    matchSymbolSource: 'codegraphy.gdscript',
    ...(language ? { matchSymbolLanguage: language } : {}),
    ...(symbolFilePath ? { matchSymbolFilePath: symbolFilePath } : {}),
    pluginId: 'codegraphy.gdscript',
    pluginName: 'Godot',
  };
}

export const PLUGIN_SYMBOL_GROUPS: SymbolDefaultGroup[] = [
  createGodotSymbolGroup({
    id: 'godot-class-name',
    displayLabel: 'class_name',
    color: '#478CBF',
    icon: mdiAlphaCBoxOutline,
    kind: 'class',
    language: 'gdscript',
    pluginKind: 'godot-class-name',
    symbolFilePath: '**/*.gd',
  }),
  createGodotSymbolGroup({
    id: 'scene',
    displayLabel: 'Scene',
    color: '#478CBF',
    icon: mdiFileTreeOutline,
    kind: 'scene',
    pluginKind: 'scene',
  }),
  createGodotSymbolGroup({
    id: 'resource',
    displayLabel: 'Resource',
    color: '#F59E0B',
    icon: mdiPackageVariantClosed,
    kind: 'resource',
    pluginKind: 'resource',
  }),
  createGodotSymbolGroup({
    id: 'autoload',
    displayLabel: 'Autoload',
    color: '#10B981',
    icon: mdiCogOutline,
    kind: 'autoload',
    pluginKind: 'autoload',
  }),
  createGodotSymbolGroup({
    id: 'scene-node',
    displayLabel: 'Scene Node',
    color: '#A855F7',
    icon: mdiFileDocumentOutline,
    kind: 'scene-node',
    pluginKind: 'scene-node',
  }),
  createGodotSymbolGroup({
    id: 'signal',
    displayLabel: 'Signal',
    color: '#EF4444',
    icon: mdiAccessPoint,
    kind: 'signal',
    pluginKind: 'signal',
  }),
  createGodotSymbolGroup({
    id: 'exported-property',
    displayLabel: 'Exported Property',
    color: '#2DD4BF',
    icon: mdiExport,
    kind: 'variable',
    language: 'gdscript',
    matchNodeType: 'variable',
    pluginKind: 'exported-property',
    symbolFilePath: '**/*.gd',
  }),
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
