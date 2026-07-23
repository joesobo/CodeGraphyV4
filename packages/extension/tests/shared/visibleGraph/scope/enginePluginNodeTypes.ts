import type { IGraphNodeTypeDefinition } from '../../../../src/shared/graphControls/contracts';

const pluginType = (
	id: string,
	parentId: string | undefined,
	pluginKind: string | undefined,
	source: string,
	options: Partial<IGraphNodeTypeDefinition> = {},
): IGraphNodeTypeDefinition => ({
	id,
	label: id,
	defaultColor: '#000000',
	defaultVisible: false,
	...(parentId ? { parentId } : {}),
	...(pluginKind ? { matchSymbolPluginKind: pluginKind } : {}),
	matchSymbolSource: source,
	...options,
});

export const ENGINE_PLUGIN_NODE_TYPES: IGraphNodeTypeDefinition[] = [
	pluginType(
		'plugin:codegraphy.gdscript:symbol:godot-class-name',
		'variable',
		'godot-class-name',
		'codegraphy.gdscript',
		{
			matchSymbolKinds: ['class'],
			matchSymbolLanguage: 'gdscript',
			matchSymbolFilePath: '**/*.gd',
		},
	),
	pluginType(
		'plugin:codegraphy.gdscript:symbol:exported-property',
		'variable',
		'exported-property',
		'codegraphy.gdscript',
	),
	...['scene', 'resource', 'autoload', 'scene-node', 'signal'].map((kind) => pluginType(
		`plugin:codegraphy.gdscript:symbol:${kind}`,
		'symbol',
		kind,
		'codegraphy.gdscript',
	)),
	pluginType(
		'plugin:codegraphy.unity:symbol',
		undefined,
		undefined,
		'codegraphy.unity',
	),
	pluginType(
		'plugin:codegraphy.unity:symbol:game-object',
		'plugin:codegraphy.unity:symbol',
		'game-object',
		'codegraphy.unity',
	),
	pluginType(
		'plugin:codegraphy.unity:symbol:component',
		'plugin:codegraphy.unity:symbol',
		'component',
		'codegraphy.unity',
	),
];
