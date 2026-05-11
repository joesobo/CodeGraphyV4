import type { IGroup } from '../../../../shared/settings/groups';

type SymbolDefaultGroup = Omit<IGroup, 'pattern' | 'isPluginDefault' | 'pluginName'> & {
  pluginName?: string;
};

const CORE_SYMBOL_GROUPS: SymbolDefaultGroup[] = [
  { id: 'default:symbol-kind:function', displayLabel: 'Function', color: '#8B5CF6', matchNodeType: 'symbol', matchSymbolKind: 'function' },
  { id: 'default:symbol-kind:method', displayLabel: 'Method', color: '#A855F7', matchNodeType: 'symbol', matchSymbolKind: 'method' },
  { id: 'default:symbol-kind:class', displayLabel: 'Class', color: '#3B82F6', matchNodeType: 'symbol', matchSymbolKind: 'class' },
  { id: 'default:symbol-kind:interface', displayLabel: 'Interface', color: '#06B6D4', matchNodeType: 'symbol', matchSymbolKind: 'interface' },
  { id: 'default:symbol-kind:struct', displayLabel: 'Struct', color: '#0EA5E9', matchNodeType: 'symbol', matchSymbolKind: 'struct' },
  { id: 'default:symbol-kind:enum', displayLabel: 'Enum', color: '#F59E0B', matchNodeType: 'symbol', matchSymbolKind: 'enum' },
  { id: 'default:symbol-kind:namespace', displayLabel: 'Namespace', color: '#64748B', matchNodeType: 'symbol', matchSymbolKind: 'namespace' },
  { id: 'default:symbol-kind:variable', displayLabel: 'Variable', color: '#14B8A6', matchNodeType: 'variable', matchSymbolKind: 'variable' },
  { id: 'default:symbol-kind:constant', displayLabel: 'Constant', color: '#22C55E', matchNodeType: 'variable', matchSymbolKind: 'constant' },
  { id: 'default:symbol-kind:property', displayLabel: 'Property', color: '#84CC16', matchNodeType: 'variable', matchSymbolKind: 'property' },
  { id: 'default:symbol-kind:plugin', displayLabel: 'Plugin Symbol', color: '#EC4899', matchNodeType: 'symbol' },
];

const PLUGIN_SYMBOL_GROUPS: SymbolDefaultGroup[] = [
  {
    id: 'default:symbol-plugin:godot-class-name',
    displayLabel: 'Godot class_name',
    color: '#478CBF',
    matchNodeType: 'symbol',
    matchSymbolKind: 'class',
    matchSymbolPluginKind: 'godot-class-name',
    matchSymbolSource: 'codegraphy.gdscript',
    matchSymbolLanguage: 'gdscript',
    matchSymbolFilePath: '**/*.gd',
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
