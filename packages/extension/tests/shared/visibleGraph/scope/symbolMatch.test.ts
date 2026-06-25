import { describe, expect, it } from 'vitest';
import type { IGraphNodeTypeDefinition } from '../../../../src/shared/graphControls/contracts';
import type { ScopedSymbolDefinition } from '../../../../src/shared/visibleGraph/scope/definitions';
import { symbolMatchesScopedDefinition } from '../../../../src/shared/visibleGraph/scope/symbolMatch';
import { node, symbolNode } from './fixture';

describe('shared/visibleGraph/scope/symbolMatch', () => {
	it('does not match nodes without symbol metadata', () => {
		expect(symbolMatchesScopedDefinition(
			node('src/app.ts'),
			createDefinition({ id: 'symbol:function', matchSymbolKinds: ['function'] }),
		)).toBe(false);
	});

	it('matches any symbol kind when a definition has no symbol-kind constraint', () => {
		expect(symbolMatchesScopedDefinition(
			symbolNode('src/app.ts#main:function', {
				id: 'src/app.ts#main:function',
				name: 'main',
				kind: 'function',
				filePath: 'src/app.ts',
			}),
			createDefinition({ id: 'plugin:custom:any-symbol' }),
		)).toBe(true);
	});

	it('uses raw glob matching for uncompiled file path constraints', () => {
		const definition = createDefinition({
			id: 'symbol:function',
			matchSymbolKinds: ['function'],
			matchSymbolFilePath: 'src/**/*.ts',
		});

		expect(symbolMatchesScopedDefinition(
			symbolNode('src/app.ts#main:function', {
				id: 'src/app.ts#main:function',
				name: 'main',
				kind: 'function',
				filePath: 'src/app.ts',
			}),
			definition,
		)).toBe(true);
		expect(symbolMatchesScopedDefinition(
			symbolNode('test/app.ts#main:function', {
				id: 'test/app.ts#main:function',
				name: 'main',
				kind: 'function',
				filePath: 'test/app.ts',
			}),
			definition,
		)).toBe(false);
	});

	it('uses compiled file path matchers when available', () => {
		const definition = createDefinition({
			id: 'symbol:function',
			matchSymbolKinds: ['function'],
			matchSymbolFilePath: 'src/**/*.ts',
		});
		const scopedDefinition: ScopedSymbolDefinition = {
			definition,
			enabled: true,
			specificity: 1,
			symbolFilePathMatches: filePath => filePath.endsWith('.generated.ts'),
		};

		expect(symbolMatchesScopedDefinition(
			symbolNode('test/app.generated.ts#main:function', {
				id: 'test/app.generated.ts#main:function',
				name: 'main',
				kind: 'function',
				filePath: 'test/app.generated.ts',
			}),
			scopedDefinition,
		)).toBe(true);
		expect(symbolMatchesScopedDefinition(
			symbolNode('src/app.ts#main:function', {
				id: 'src/app.ts#main:function',
				name: 'main',
				kind: 'function',
				filePath: 'src/app.ts',
			}),
			scopedDefinition,
		)).toBe(false);
	});

	it('ignores compiled matcher fields on plain definitions', () => {
		const definition = {
			...createDefinition({
				id: 'symbol:function',
				matchSymbolKinds: ['function'],
				matchSymbolFilePath: 'src/**/*.ts',
			}),
			symbolFilePathMatches: () => true,
		};

		expect(symbolMatchesScopedDefinition(
			symbolNode('test/app.ts#main:function', {
				id: 'test/app.ts#main:function',
				name: 'main',
				kind: 'function',
				filePath: 'test/app.ts',
			}),
			definition,
		)).toBe(false);
	});
});

function createDefinition(input: {
	id: string;
	matchSymbolKinds?: string[];
	matchSymbolFilePath?: string;
}): IGraphNodeTypeDefinition {
	return {
		id: input.id,
		label: input.id,
		defaultColor: '#111111',
		defaultVisible: false,
		...(input.matchSymbolKinds ? { matchSymbolKinds: input.matchSymbolKinds } : {}),
		...(input.matchSymbolFilePath ? { matchSymbolFilePath: input.matchSymbolFilePath } : {}),
	};
}
