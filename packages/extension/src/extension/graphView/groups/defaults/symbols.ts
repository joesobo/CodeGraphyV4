import type { IGroup } from '../../../../shared/settings/groups';
import {
  mdiAlphaCBoxOutline,
  mdiAlphaIBoxOutline,
  mdiAlphaTBoxOutline,
  mdiCubeOutline,
  mdiFormatListBulletedType,
  mdiFunction,
  mdiFunctionVariant,
  mdiLockOutline,
  mdiPound,
  mdiVariable,
} from '@mdi/js';
import { toSvgDataUrl } from './materialTheme/svg';

type SymbolDefaultGroup = Omit<IGroup, 'pattern' | 'isPluginDefault' | 'pluginName'> & {
  pluginId?: string;
  pluginName?: string;
};

const CORE_SYMBOL_GROUPS: SymbolDefaultGroup[] = [
  { id: 'default:symbol-kind:function', displayLabel: 'Function', color: '#8B5CF6', imageUrl: createMaterialSymbolIconDataUrl(mdiFunction), matchNodeType: 'symbol', matchSymbolKind: 'function' },
  { id: 'default:symbol-kind:method', displayLabel: 'Method', color: '#A855F7', imageUrl: createMaterialSymbolIconDataUrl(mdiFunctionVariant), matchNodeType: 'symbol', matchSymbolKind: 'method' },
  { id: 'default:symbol-kind:class', displayLabel: 'Class', color: '#3B82F6', imageUrl: createMaterialSymbolIconDataUrl(mdiAlphaCBoxOutline), matchNodeType: 'symbol', matchSymbolKind: 'class' },
  { id: 'default:symbol-kind:interface', displayLabel: 'Interface', color: '#06B6D4', imageUrl: createMaterialSymbolIconDataUrl(mdiAlphaIBoxOutline), matchNodeType: 'symbol', matchSymbolKind: 'interface' },
  { id: 'default:symbol-kind:type', displayLabel: 'Type', color: '#EC4899', imageUrl: createMaterialSymbolIconDataUrl(mdiAlphaTBoxOutline), matchNodeType: 'symbol', matchSymbolKind: 'type' },
  { id: 'default:symbol-kind:struct', displayLabel: 'Struct', color: '#0EA5E9', imageUrl: createMaterialSymbolIconDataUrl(mdiCubeOutline), matchNodeType: 'symbol', matchSymbolKind: 'struct' },
  { id: 'default:symbol-kind:enum', displayLabel: 'Enum', color: '#F59E0B', imageUrl: createMaterialSymbolIconDataUrl(mdiFormatListBulletedType), matchNodeType: 'symbol', matchSymbolKind: 'enum' },
  { id: 'default:symbol-kind:variable', displayLabel: 'Variable', color: '#14B8A6', imageUrl: createMaterialSymbolIconDataUrl(mdiVariable), matchNodeType: 'variable', matchSymbolKind: 'variable' },
  { id: 'default:symbol-kind:constant', displayLabel: 'Constant', color: '#22C55E', imageUrl: createMaterialSymbolIconDataUrl(mdiLockOutline), matchNodeType: 'variable', matchSymbolKind: 'constant' },
  { id: 'default:symbol-kind:property', displayLabel: 'Property', color: '#84CC16', imageUrl: createMaterialSymbolIconDataUrl(mdiPound), matchNodeType: 'variable', matchSymbolKind: 'property' },
  { id: 'default:symbol-kind:plugin', displayLabel: 'Plugin Symbol', color: '#EC4899', matchNodeType: 'symbol' },
];

const PLUGIN_SYMBOL_GROUPS: SymbolDefaultGroup[] = [
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

export function getSymbolDefaultGroups(): IGroup[] {
  return [...CORE_SYMBOL_GROUPS, ...PLUGIN_SYMBOL_GROUPS].map((group) => ({
    pattern: '**',
    isPluginDefault: true,
    pluginName: 'CodeGraphy',
    ...group,
  }));
}

function createMaterialSymbolIconDataUrl(pathData: string): string {
  return toSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#FFFFFF" d="${pathData}"/></svg>`);
}
