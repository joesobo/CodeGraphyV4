import { describe, expect, it } from 'vitest';
import { keepMostSpecificUniqueEdges } from '../../../../src/shared/visibleGraph/scope/edgeSelection';
import { edge, ids, node } from './fixture';

describe('shared/visibleGraph/scope/edgeSelection', () => {
	it('returns an empty edge list when there are no candidates', () => {
		expect(keepMostSpecificUniqueEdges([], [])).toEqual([]);
	});

	it('keeps contains edges without endpoint preference filtering', () => {
		const result = keepMostSpecificUniqueEdges(
			[
				node('src/app.ts'),
				node('src/app.ts#main:function', 'symbol'),
			],
			[
				edge('src/app.ts', 'src/app.ts#main:function', 'contains'),
			],
		);

		expect(ids({ nodes: [], edges: result })).toEqual({
			nodes: [],
			edges: ['src/app.ts->src/app.ts#main:function#contains'],
		});
	});
});
