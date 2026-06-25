import { describe, expect, it } from 'vitest';
import {
	getEdgeContainingFileKey,
	getEndpointPreference,
	rememberBestEndpointPreference,
} from '../../../../src/shared/visibleGraph/scope/edgePreference';
import { edge, node, symbolNode } from './fixture';

describe('shared/visibleGraph/scope/edgePreference', () => {
	it('builds grouping keys from containing files for symbol endpoints', () => {
		expect(getEdgeContainingFileKey(
			edge('src/app.ts#main:function', 'src/logger.ts#write:function', 'call'),
			new Map([
				['src/app.ts#main:function', symbolNode('src/app.ts#main:function', {
					id: 'src/app.ts#main:function',
					name: 'main',
					kind: 'function',
					filePath: 'src/app.ts',
				})],
				['src/logger.ts#write:function', symbolNode('src/logger.ts#write:function', {
					id: 'src/logger.ts#write:function',
					name: 'write',
					kind: 'function',
					filePath: 'src/logger.ts',
				})],
			]),
		)).toBe('call\0src/app.ts\0src/logger.ts');
	});

	it('falls back to raw endpoint ids when nodes are missing from the lookup', () => {
		expect(getEdgeContainingFileKey(
			edge('src/missing-from.ts#main:function', 'src/missing-to.ts#write:function', 'call'),
			new Map(),
		)).toBe('call\0src/missing-from.ts#main:function\0src/missing-to.ts#write:function');
	});

	it('prefers edges with more symbol endpoints except type imports', () => {
		const nodeById = new Map([
			['src/app.ts', node('src/app.ts')],
			['src/logger.ts#write:function', symbolNode('src/logger.ts#write:function', {
				id: 'src/logger.ts#write:function',
				name: 'write',
				kind: 'function',
				filePath: 'src/logger.ts',
			})],
		]);

		expect(getEndpointPreference(edge('src/app.ts', 'src/logger.ts#write:function', 'call'), nodeById)).toBe(1);
		expect(getEndpointPreference(edge('src/app.ts', 'src/logger.ts#write:function', 'type-import'), nodeById)).toBe(-1);
	});

	it('treats missing endpoint nodes as file-level preference', () => {
		expect(getEndpointPreference(
			edge('src/missing-from.ts#main:function', 'src/missing-to.ts#write:function', 'call'),
			new Map(),
		)).toBe(0);
	});

	it('remembers the highest endpoint preference for each grouping key', () => {
		const preferences = new Map<string, number>();

		rememberBestEndpointPreference(preferences, 'call\0src/app.ts\0src/logger.ts', 1);
		rememberBestEndpointPreference(preferences, 'call\0src/app.ts\0src/logger.ts', 0);
		rememberBestEndpointPreference(preferences, 'call\0src/app.ts\0src/logger.ts', 2);

		expect(preferences.get('call\0src/app.ts\0src/logger.ts')).toBe(2);
	});
});
