import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../src/shared/graph/contracts';
import { applyGraphScope } from '../../../src/shared/visibleGraph/scope';
import {
	getDefinitionSymbolKinds,
	getScopedSymbolDefinitions,
} from '../../../src/shared/visibleGraph/scope/definitions';

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

	it('uses the narrower method row before the broad function row for method symbols', () => {
		const result = applyGraphScope(
			{
				nodes: [
					node('src/runner.cpp'),
					symbolNode('src/runner.cpp#TaskRunner::run:method', {
						id: 'src/runner.cpp#TaskRunner::run:method',
						name: 'TaskRunner::run',
						kind: 'method',
						filePath: 'src/runner.cpp',
					}),
				],
				edges: [
					edge('src/runner.cpp', 'src/runner.cpp#TaskRunner::run:method', 'contains'),
				],
			},
			{
				nodes: [
					{ type: 'file', enabled: true },
					{ type: 'symbol', enabled: true },
					{ type: 'symbol:function', enabled: false },
					{ type: 'symbol:method', enabled: true },
				],
				edges: [{ type: 'contains', enabled: true }],
			},
		);

		expect(ids(result)).toEqual({
			nodes: ['src/runner.cpp', 'src/runner.cpp#TaskRunner::run:method'],
			edges: ['src/runner.cpp->src/runner.cpp#TaskRunner::run:method#contains'],
		});
	});

	it('reads scoped symbol definition kinds and specificity from explicit and fallback matchers', () => {
		expect(getDefinitionSymbolKinds({
			id: 'symbol:function',
			label: 'Function',
			defaultColor: '#8B5CF6',
			defaultVisible: false,
			matchSymbolKinds: ['function', 'method'],
		})).toEqual(['function', 'method']);
		expect(getDefinitionSymbolKinds({
			id: 'symbol:class',
			label: 'Class',
			defaultColor: '#3B82F6',
			defaultVisible: false,
		})).toEqual(['class']);
		expect(getDefinitionSymbolKinds({
			id: 'file',
			label: 'File',
			defaultColor: '#71717A',
			defaultVisible: true,
		})).toBeUndefined();

		expect(getScopedSymbolDefinitions({
			nodes: [
				{ type: 'symbol:function', enabled: false },
				{ type: 'symbol:method', enabled: true },
				{ type: 'plugin:codegraphy.gdscript:symbol:godot-class-name', enabled: false },
			],
			edges: [],
		}).map((entry) => ({
			id: entry.definition.id,
			enabled: entry.enabled,
			specificity: entry.specificity,
		}))).toEqual([
			{
				id: 'plugin:codegraphy.gdscript:symbol:godot-class-name',
				enabled: false,
				specificity: 5,
			},
			{
				id: 'symbol:method',
				enabled: true,
				specificity: 1,
			},
			{
				id: 'symbol:function',
				enabled: false,
				specificity: 0.5,
			},
		]);
	});

	it('keeps symbol nodes that are disconnected after edge scope is applied', () => {
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
			nodes: ['src/widget.cpp', 'include/base.h', 'src/widget.cpp#Widget:class', 'include/base.h#Base:class'],
			edges: ['src/widget.cpp->include/base.h#import'],
		});
	});

	it('keeps enabled symbol nodes as orphans when unrelated file edges are visible', () => {
		const result = applyGraphScope(
			{
				nodes: [
					node('src/main.c'),
					node('src/logger/logger.h'),
					symbolNode('src/logger/logger.h#logger_init:prototype', {
						id: 'src/logger/logger.h#logger_init:prototype',
						name: 'logger_init',
						kind: 'prototype',
						filePath: 'src/logger/logger.h',
					}),
				],
				edges: [
					edge('src/main.c', 'src/logger/logger.h', 'include'),
				],
			},
			{
				nodes: [
					{ type: 'file', enabled: true },
					{ type: 'symbol', enabled: true },
					{ type: 'symbol:prototype', enabled: true },
				],
				edges: [
					{ type: 'include', enabled: true },
					{ type: 'contains', enabled: false },
				],
			},
		);

		expect(ids(result)).toEqual({
			nodes: [
				'src/main.c',
				'src/logger/logger.h',
				'src/logger/logger.h#logger_init:prototype',
			],
			edges: ['src/main.c->src/logger/logger.h#include'],
		});
	});

	it('does not treat parent toggles as catch-all symbol node types', () => {
		const result = applyGraphScope(
			{
				nodes: [
					node('src/app.ts'),
					symbolNode('src/app.ts#counter:variable', {
						id: 'src/app.ts#counter:variable',
						name: 'counter',
						kind: 'variable',
						filePath: 'src/app.ts',
					}),
				],
				edges: [
					edge('src/app.ts', 'src/app.ts#counter:variable', 'contains'),
				],
			},
			{
				nodes: [
					{ type: 'file', enabled: true },
					{ type: 'symbol', enabled: true },
					{ type: 'variable', enabled: true },
				],
				edges: [
					{ type: 'contains', enabled: true },
				],
			},
		);

		expect(ids(result)).toEqual({
			nodes: ['src/app.ts'],
			edges: [],
		});
	});

	it('removes duplicate file edges when an equivalent symbol relation edge is visible', () => {
		const result = applyGraphScope(
			{
				nodes: [
					node('src/runner.cpp'),
					node('src/base.hpp'),
					symbolNode('src/runner.cpp#Runner:class', {
						id: 'src/runner.cpp#Runner:class',
						name: 'Runner',
						kind: 'class',
						filePath: 'src/runner.cpp',
					}),
					symbolNode('src/base.hpp#Base:class', {
						id: 'src/base.hpp#Base:class',
						name: 'Base',
						kind: 'class',
						filePath: 'src/base.hpp',
					}),
				],
				edges: [
					edge('src/runner.cpp', 'src/base.hpp', 'inherit'),
					edge('src/runner.cpp', 'src/base.hpp#Base:class', 'inherit'),
					edge('src/runner.cpp#Runner:class', 'src/base.hpp#Base:class', 'inherit'),
				],
			},
			{
				nodes: [
					{ type: 'file', enabled: true },
					{ type: 'symbol', enabled: true },
					{ type: 'symbol:class', enabled: true },
				],
				edges: [
					{ type: 'inherit', enabled: true },
				],
			},
		);

		expect(ids(result)).toEqual({
			nodes: [
				'src/runner.cpp',
				'src/base.hpp',
				'src/runner.cpp#Runner:class',
				'src/base.hpp#Base:class',
			],
			edges: ['src/runner.cpp#Runner:class->src/base.hpp#Base:class#inherit'],
		});
	});

	it('keeps file-level type imports when imported type symbols are visible', () => {
		const result = applyGraphScope(
			{
				nodes: [
					node('src/alias/themePack.ts'),
					node('src/types.ts'),
					symbolNode('src/types.ts#PaletteMood:type', {
						id: 'src/types.ts:type:PaletteMood',
						filePath: 'src/types.ts',
						kind: 'type',
						name: 'PaletteMood',
					}),
				],
				edges: [
					edge('src/alias/themePack.ts', 'src/types.ts', 'type-import'),
					edge('src/alias/themePack.ts', 'src/types.ts#PaletteMood:type', 'type-import'),
					edge('src/types.ts', 'src/types.ts#PaletteMood:type', 'contains'),
				],
			},
			{
				nodes: [
					{ type: 'file', enabled: true },
					{ type: 'symbol', enabled: true },
					{ type: 'symbol:type', enabled: true },
				],
				edges: [
					{ type: 'type-import', enabled: true },
					{ type: 'contains', enabled: true },
				],
			},
		);

		expect(ids(result)).toEqual({
			nodes: [
				'src/alias/themePack.ts',
				'src/types.ts',
				'src/types.ts#PaletteMood:type',
			],
			edges: [
				'src/alias/themePack.ts->src/types.ts#type-import',
				'src/types.ts->src/types.ts#PaletteMood:type#contains',
			],
		});
	});

	it('keeps one visible edge for repeated edges with the same identity', () => {
		const result = applyGraphScope(
			{
				nodes: [
					symbolNode('src/app.py#process_data:function', {
						id: 'src/app.py#process_data:function',
						name: 'process_data',
						kind: 'function',
						filePath: 'src/app.py',
					}),
					symbolNode('src/format.py#format_output:function', {
						id: 'src/format.py#format_output:function',
						name: 'format_output',
						kind: 'function',
						filePath: 'src/format.py',
					}),
				],
				edges: [
					edge('src/app.py#process_data:function', 'src/format.py#format_output:function', 'call'),
					edge('src/app.py#process_data:function', 'src/format.py#format_output:function', 'call'),
				],
			},
			{
				nodes: [
					{ type: 'symbol', enabled: true },
					{ type: 'symbol:function', enabled: true },
				],
				edges: [
					{ type: 'call', enabled: true },
				],
			},
		);

		expect(ids(result)).toEqual({
			nodes: [
				'src/app.py#process_data:function',
				'src/format.py#format_output:function',
			],
			edges: ['src/app.py#process_data:function->src/format.py#format_output:function#call'],
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
					{ type: 'symbol', enabled: true },
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
