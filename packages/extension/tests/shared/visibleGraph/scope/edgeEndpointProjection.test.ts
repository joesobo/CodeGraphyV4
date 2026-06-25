import { describe, expect, it } from 'vitest';
import { getVisibleEdgeEndpoint } from '../../../../src/shared/visibleGraph/scope/edgeEndpointProjection';
import { node, symbolNode } from './fixture';

describe('shared/visibleGraph/scope/edgeEndpointProjection', () => {
	it('returns visible node ids without projection', () => {
		expect(getVisibleEdgeEndpoint(
			'src/app.ts',
			new Map([
				['src/app.ts', node('src/app.ts')],
			]),
			new Set(['src/app.ts']),
		)).toBe('src/app.ts');
	});

	it('projects hidden symbol ids to their visible containing file', () => {
		expect(getVisibleEdgeEndpoint(
			'src/app.ts#main:function',
			new Map([
				['src/app.ts', node('src/app.ts')],
				['src/app.ts#main:function', symbolNode('src/app.ts#main:function', {
					id: 'src/app.ts#main:function',
					name: 'main',
					kind: 'function',
					filePath: 'src/app.ts',
				})],
			]),
			new Set(['src/app.ts']),
		)).toBe('src/app.ts');
	});

	it('does not project known symbols when their containing file is hidden', () => {
		expect(getVisibleEdgeEndpoint(
			'src/app.ts#main:function',
			new Map([
				['src/app.ts', node('src/app.ts')],
				['src/app.ts#main:function', symbolNode('src/app.ts#main:function', {
					id: 'src/app.ts#main:function',
					name: 'main',
					kind: 'function',
					filePath: 'src/app.ts',
				})],
			]),
			new Set(['src/other.ts']),
		)).toBeUndefined();
	});
});
