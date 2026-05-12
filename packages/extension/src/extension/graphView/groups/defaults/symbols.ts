import type { IGroup } from '../../../../shared/settings/groups';
import type { IGraphData } from '../../../../shared/graph/contracts';
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
import { globMatch } from '../../../../shared/globMatch';
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

export function getSymbolDefaultGroups(graphData: IGraphData): IGroup[] {
  return [...CORE_SYMBOL_GROUPS, ...PLUGIN_SYMBOL_GROUPS]
    .filter((group) => graphData.nodes.some((node) => symbolGroupMatchesNode(group, node)))
    .map((group) => ({
    pattern: '**',
    isPluginDefault: true,
    pluginName: 'CodeGraphy',
    ...group,
  }));
}

function symbolGroupMatchesNode(
  group: SymbolDefaultGroup,
  node: IGraphData['nodes'][number],
): boolean {
  const symbol = node.symbol;
  if (!symbol) {
    return false;
  }

  if (group.matchNodeType && group.matchNodeType !== node.nodeType) {
    return false;
  }
  if (group.matchSymbolKind && group.matchSymbolKind !== symbol.kind) {
    return false;
  }
  if (group.matchSymbolPluginKind && group.matchSymbolPluginKind !== symbol.pluginKind) {
    return false;
  }
  if (group.matchSymbolSource && group.matchSymbolSource !== symbol.source) {
    return false;
  }
  if (group.matchSymbolLanguage && group.matchSymbolLanguage !== symbol.language) {
    return false;
  }
  if (group.matchSymbolFilePath && !globMatch(symbol.filePath, group.matchSymbolFilePath)) {
    return false;
  }

  return true;
}

function createMaterialSymbolIconDataUrl(pathData: string): string {
  return toSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#FFFFFF" d="${pathData}"/></svg>`);
}
