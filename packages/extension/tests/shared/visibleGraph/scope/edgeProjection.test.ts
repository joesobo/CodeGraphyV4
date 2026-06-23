import { describe, expect, it } from 'vitest';
import type { IGraphEdge } from '../../../../src/shared/graph/contracts';
import { projectEdgesToVisibleNodes } from '../../../../src/shared/visibleGraph/scope/edgeProjection';
import { edge, ids, node, symbolNode } from './fixture';

describe('shared/visibleGraph/scope/edgeProjection', () => {
	it('drops edges when either endpoint cannot be projected to a visible node', () => {
		const result = projectEdgesToVisibleNodes(
			[
				edge('src/app.ts', 'src/missing.ts#missing:function', 'call'),
			],
			[
				node('src/app.ts'),
			],
			[
				node('src/app.ts'),
			],
		);

		expect(ids({ nodes: [], edges: result })).toEqual({
			nodes: [],
			edges: [],
		});
	});

	it('keeps already visible edges unchanged even when they are file-level self edges', () => {
		const visibleSelfEdge: IGraphEdge = {
			...edge('src/runner.dart', 'src/runner.dart', 'call'),
			id: 'stable-self-call-id',
		};

		const result = projectEdgesToVisibleNodes(
			[
				visibleSelfEdge,
			],
			[
				node('src/runner.dart'),
			],
			[
				node('src/runner.dart'),
			],
		);

		expect(result).toEqual([visibleSelfEdge]);
	});

	it('projects hidden symbol endpoints to their visible containing files', () => {
		const result = projectEdgesToVisibleNodes(
			[
				edge('src/app.ts#main:function', 'src/logger.ts', 'call'),
			],
			[
				node('src/app.ts'),
				node('src/logger.ts'),
				symbolNode('src/app.ts#main:function', {
					id: 'src/app.ts#main:function',
					name: 'main',
					kind: 'function',
					filePath: 'src/app.ts',
				}),
			],
			[
				node('src/app.ts'),
				node('src/logger.ts'),
			],
		);

		expect(ids({ nodes: [], edges: result })).toEqual({
			nodes: [],
			edges: ['src/app.ts->src/logger.ts#call'],
		});
	});

	it('drops hidden symbol edges projected onto the same visible file', () => {
		const result = projectEdgesToVisibleNodes(
			[
				edge('src/runner.dart#run:method', 'src/runner.dart#Runner:class', 'call'),
			],
			[
				node('src/runner.dart'),
				symbolNode('src/runner.dart#run:method', {
					id: 'src/runner.dart#run:method',
					name: 'run',
					kind: 'method',
					filePath: 'src/runner.dart',
				}),
				symbolNode('src/runner.dart#Runner:class', {
					id: 'src/runner.dart#Runner:class',
					name: 'Runner',
					kind: 'class',
					filePath: 'src/runner.dart',
				}),
			],
			[
				node('src/runner.dart'),
			],
		);

		expect(ids({ nodes: [], edges: result })).toEqual({
			nodes: [],
			edges: [],
		});
	});

	it('uses the edge kind as the projected id suffix when the source id has no suffix marker', () => {
		const result = projectEdgesToVisibleNodes(
			[
				{
					...edge('src/app.ts#main:function', 'src/logger.ts', 'call'),
					id: 'stable-call-id',
				},
			],
			[
				node('src/app.ts'),
				node('src/logger.ts'),
				symbolNode('src/app.ts#main:function', {
					id: 'src/app.ts#main:function',
					name: 'main',
					kind: 'function',
					filePath: 'src/app.ts',
				}),
			],
			[
				node('src/app.ts'),
				node('src/logger.ts'),
			],
		);

		expect(ids({ nodes: [], edges: result })).toEqual({
			nodes: [],
			edges: ['src/app.ts->src/logger.ts#call'],
		});
	});

	it('keeps source id suffixes that start at the first character', () => {
		const result = projectEdgesToVisibleNodes(
			[
				{
					...edge('src/app.ts#main:function', 'src/logger.ts', 'call'),
					id: '#legacy-call',
				},
			],
			[
				node('src/app.ts'),
				node('src/logger.ts'),
				symbolNode('src/app.ts#main:function', {
					id: 'src/app.ts#main:function',
					name: 'main',
					kind: 'function',
					filePath: 'src/app.ts',
				}),
			],
			[
				node('src/app.ts'),
				node('src/logger.ts'),
			],
		);

		expect(ids({ nodes: [], edges: result })).toEqual({
			nodes: [],
			edges: ['src/app.ts->src/logger.ts#legacy-call'],
		});
	});
});
