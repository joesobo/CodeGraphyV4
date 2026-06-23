import { describe, expect, it } from 'vitest';
import type { IGraphNodeTypeDefinition } from '../../../../src/shared/graphControls/contracts';
import type { ScopedSymbolDefinition } from '../../../../src/shared/visibleGraph/scope/definitions';
import { nodeMatchesScope } from '../../../../src/shared/visibleGraph/scope/nodes';
import { node, symbolNode } from './fixture';

describe('shared/visibleGraph/scope/nodes', () => {
	it('hides core child node types when their direct parent is disabled', () => {
		expect(nodeMatchesScope(
			node('src/app.ts#main:function', 'symbol:function'),
			new Set(['symbol']),
			[],
		)).toBe(false);
	});

	it('hides core child node types when a grandparent is disabled', () => {
		expect(nodeMatchesScope(
			node('src/app.ts#count:variable', 'variable:plain'),
			new Set(['symbol']),
			[],
		)).toBe(false);
	});

	it('does not throw for unknown node types without a registered parent', () => {
		expect(nodeMatchesScope(
			node('src/app.ts#custom', 'plugin:custom-node'),
			new Set(),
			[],
		)).toBe(true);
	});

	it('hides scoped symbols when their scoped parent row is disabled', () => {
		expect(nodeMatchesScope(
			symbolNode('src/app.ts#counter:local', {
				id: 'src/app.ts#counter:local',
				name: 'counter',
				kind: 'local',
				filePath: 'src/app.ts',
			}, 'file'),
			new Set(['variable']),
			[
				createScopedDefinition({
					id: 'symbol:local',
					parentId: 'variable',
					matchSymbolKinds: ['local'],
					enabled: true,
				}),
			],
		)).toBe(false);
	});

	it('does not throw for scoped symbol parents outside the core hierarchy', () => {
		expect(nodeMatchesScope(
			symbolNode('src/app.ts#main:function', {
				id: 'src/app.ts#main:function',
				name: 'main',
				kind: 'function',
				filePath: 'src/app.ts',
			}, 'file'),
			new Set(),
			[
				createScopedDefinition({
					id: 'plugin:custom:function',
					parentId: 'plugin:custom-parent',
					matchSymbolKinds: ['function'],
					enabled: true,
				}),
			],
		)).toBe(true);
	});
});

function createScopedDefinition(input: {
	id: string;
	parentId: string;
	matchSymbolKinds: string[];
	enabled: boolean;
}): ScopedSymbolDefinition {
	return {
		definition: createNodeTypeDefinition(input),
		enabled: input.enabled,
		specificity: 1,
	};
}

function createNodeTypeDefinition(input: {
	id: string;
	parentId: string;
	matchSymbolKinds: string[];
}): IGraphNodeTypeDefinition {
	return {
		id: input.id,
		label: input.id,
		defaultColor: '#111111',
		defaultVisible: false,
		parentId: input.parentId,
		matchSymbolKinds: input.matchSymbolKinds,
	};
}
