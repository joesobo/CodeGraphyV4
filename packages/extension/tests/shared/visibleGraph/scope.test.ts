import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../src/shared/graph/contracts';
import { applyGraphScope } from '../../../src/shared/visibleGraph/scope';

function node(id: string, nodeType = 'file'): IGraphNode {
	return {
		id,
		label: id.split('/').pop() ?? id,
		color: '#111111',
		nodeType,
	};
}

function symbolNode(
	id: string,
	symbol: NonNullable<IGraphNode['symbol']>,
	nodeType = 'symbol',
): IGraphNode {
	return {
		...node(id, nodeType),
		symbol,
	};
}

function edge(from: string, to: string, kind: IGraphEdge['kind']): IGraphEdge {
	return {
		id: `${from}->${to}#${kind}`,
		from,
		to,
		kind,
		sources: [],
	};
}

function ids(graphData: IGraphData): { nodes: string[]; edges: string[] } {
	return {
		nodes: graphData.nodes.map((item) => item.id),
		edges: graphData.edges.map((item) => item.id),
	};
}

describe('shared/visibleGraph/scope', () => {
	it('filters disabled nodes, disabled edge kinds, and edges attached to hidden nodes', () => {
		const result = applyGraphScope(
			{
				nodes: [
					node('src/app.ts'),
					node('src/hidden.generated.ts', 'generated'),
					node('src/readme.md'),
				],
				edges: [
					edge('src/app.ts', 'src/readme.md', 'import'),
					edge('src/app.ts', 'src/readme.md', 'reference'),
					edge('src/app.ts', 'src/hidden.generated.ts', 'reference'),
					edge('src/hidden.generated.ts', 'src/readme.md', 'import'),
				],
			},
			{
				nodes: [{ type: 'generated', enabled: false }],
				edges: [{ type: 'reference', enabled: false }],
			},
		);

		expect(ids(result)).toEqual({
			nodes: ['src/app.ts', 'src/readme.md'],
			edges: ['src/app.ts->src/readme.md#import'],
		});
	});

	it('matches symbol-kind definitions that derive their kind from the type id', () => {
		const result = applyGraphScope(
			{
				nodes: [
					node('src/app.ts'),
					symbolNode('src/app.ts#User:class', {
						id: 'src/app.ts#User:class',
						name: 'User',
						kind: 'class',
						filePath: 'src/app.ts',
					}),
					symbolNode('src/app.ts#build:function', {
						id: 'src/app.ts#build:function',
						name: 'build',
						kind: 'function',
						filePath: 'src/app.ts',
					}),
				],
				edges: [
					edge('src/app.ts', 'src/app.ts#User:class', 'contains'),
					edge('src/app.ts', 'src/app.ts#build:function', 'contains'),
				],
			},
			{
				nodes: [
					{ type: 'file', enabled: true },
					{ type: 'symbol', enabled: true },
					{ type: 'symbol:class', enabled: false },
					{ type: 'symbol:function', enabled: true },
				],
				edges: [{ type: 'contains', enabled: true }],
			},
		);

		expect(ids(result)).toEqual({
			nodes: ['src/app.ts', 'src/app.ts#build:function'],
			edges: ['src/app.ts->src/app.ts#build:function#contains'],
		});
	});

	it('hides symbol nodes that are disconnected after edge scope is applied', () => {
		const result = applyGraphScope(
			{
				nodes: [
					node('src/widget.cpp'),
					node('include/base.h'),
					symbolNode('src/widget.cpp#Widget:class', {
						id: 'src/widget.cpp#Widget:class',
						name: 'Widget',
						kind: 'class',
						filePath: 'src/widget.cpp',
					}),
					symbolNode('include/base.h#Base:class', {
						id: 'include/base.h#Base:class',
						name: 'Base',
						kind: 'class',
						filePath: 'include/base.h',
					}),
				],
				edges: [
					edge('src/widget.cpp', 'include/base.h', 'import'),
					edge('src/widget.cpp', 'src/widget.cpp#Widget:class', 'contains'),
					edge('include/base.h', 'include/base.h#Base:class', 'contains'),
				],
			},
			{
				nodes: [
					{ type: 'file', enabled: true },
					{ type: 'symbol', enabled: true },
					{ type: 'symbol:class', enabled: true },
				],
				edges: [
					{ type: 'import', enabled: true },
					{ type: 'contains', enabled: false },
				],
			},
		);

		expect(ids(result)).toEqual({
			nodes: ['src/widget.cpp', 'include/base.h'],
			edges: ['src/widget.cpp->include/base.h#import'],
		});
	});

	it('uses the most specific plugin symbol rule before a general symbol kind rule', () => {
		const result = applyGraphScope(
			{
				nodes: [
					node('src/user.ts'),
					symbolNode('src/user.ts#User:class', {
						id: 'src/user.ts#User:class',
						name: 'User',
						kind: 'class',
						filePath: 'src/user.ts',
					}),
					symbolNode('scripts/player.gd#Player:class', {
						id: 'scripts/player.gd#Player:class',
						name: 'Player',
						kind: 'class',
						filePath: 'scripts/player.gd',
						pluginKind: 'godot-class-name',
						source: 'codegraphy.gdscript',
						language: 'gdscript',
					}),
				],
				edges: [
					edge('src/user.ts', 'src/user.ts#User:class', 'contains'),
					edge('src/user.ts', 'scripts/player.gd#Player:class', 'reference'),
				],
			},
			{
				nodes: [
					{ type: 'file', enabled: true },
					{ type: 'symbol', enabled: true },
					{ type: 'symbol:class', enabled: true },
					{ type: 'plugin:codegraphy.gdscript:symbol:godot-class-name', enabled: false },
				],
				edges: [
					{ type: 'contains', enabled: true },
					{ type: 'reference', enabled: true },
				],
			},
		);

		expect(ids(result)).toEqual({
			nodes: ['src/user.ts', 'src/user.ts#User:class'],
			edges: ['src/user.ts->src/user.ts#User:class#contains'],
		});
	});

	it('requires every plugin-specific symbol field to match', () => {
		const matching = symbolNode('scripts/player.gd#Player:class', {
			id: 'scripts/player.gd#Player:class',
			name: 'Player',
			kind: 'class',
			filePath: 'scripts/player.gd',
			pluginKind: 'godot-class-name',
			source: 'codegraphy.gdscript',
			language: 'gdscript',
		});
		const wrongPluginKind = symbolNode('scripts/enemy.gd#Enemy:class', {
			id: 'scripts/enemy.gd#Enemy:class',
			name: 'Enemy',
			kind: 'class',
			filePath: 'scripts/enemy.gd',
			pluginKind: 'ordinary-class',
			source: 'codegraphy.gdscript',
			language: 'gdscript',
		});
		const wrongSource = symbolNode('scripts/npc.gd#Npc:class', {
			id: 'scripts/npc.gd#Npc:class',
			name: 'Npc',
			kind: 'class',
			filePath: 'scripts/npc.gd',
			pluginKind: 'godot-class-name',
			source: 'other-plugin',
			language: 'gdscript',
		});
		const wrongLanguage = symbolNode('scripts/item.gd#Item:class', {
			id: 'scripts/item.gd#Item:class',
			name: 'Item',
			kind: 'class',
			filePath: 'scripts/item.gd',
			pluginKind: 'godot-class-name',
			source: 'codegraphy.gdscript',
			language: 'typescript',
		});
		const wrongFilePath = symbolNode('src/player.ts#Player:class', {
			id: 'src/player.ts#Player:class',
			name: 'Player',
			kind: 'class',
			filePath: 'src/player.ts',
			pluginKind: 'godot-class-name',
			source: 'codegraphy.gdscript',
			language: 'gdscript',
		});

		const result = applyGraphScope(
			{
				nodes: [
					matching,
					wrongPluginKind,
					wrongSource,
					wrongLanguage,
					wrongFilePath,
				],
				edges: [],
			},
			{
				nodes: [
					{ type: 'symbol', enabled: false },
					{ type: 'symbol:class', enabled: false },
					{ type: 'plugin:codegraphy.gdscript:symbol:godot-class-name', enabled: true },
				],
				edges: [],
			},
		);

		expect(ids(result)).toEqual({
			nodes: ['scripts/player.gd#Player:class'],
			edges: [],
		});
	});
});
