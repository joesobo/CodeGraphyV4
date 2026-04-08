import { describe, it, expect } from 'vitest';
import {
	matchExtendsClass,
	matchTypeAnnotations,
	matchReturnType,
} from '../src/sources/class-name-declarations';

describe('matchExtendsClass', () => {
	it('should return the class name for a simple extends line', () => {
		const result = matchExtendsClass('extends Player');

		expect(result).toBe('Player');
	});

	it('should return the class name when a trailing comment is present', () => {
		const result = matchExtendsClass('extends Player # comment');

		expect(result).toBe('Player');
	});

	it('should return null when the class name starts with lowercase', () => {
		const result = matchExtendsClass('extends node2D');

		expect(result).toBeNull();
	});

	it('should return null when extends appears mid-line', () => {
		const result = matchExtendsClass('x extends Player');

		expect(result).toBeNull();
	});

	it('should return null when trailing non-comment content follows the class name', () => {
		const result = matchExtendsClass('extends Player extra');

		expect(result).toBeNull();
	});

	it('should handle multiple spaces between extends and the class name', () => {
		const result = matchExtendsClass('extends  Player');

		expect(result).toBe('Player');
	});

	it('should return null for an empty string', () => {
		const result = matchExtendsClass('');

		expect(result).toBeNull();
	});
});

describe('matchTypeAnnotations', () => {
	it('should match a simple type annotation', () => {
		const result = matchTypeAnnotations('var x: Player');

		expect(result).toEqual(['Player']);
	});

	it('should match a type annotation with no space after the colon', () => {
		const result = matchTypeAnnotations('var x:Player');

		expect(result).toEqual(['Player']);
	});

	it('should match a type annotation with a space before the colon', () => {
		const result = matchTypeAnnotations('var x : Player');

		expect(result).toEqual(['Player']);
	});

	it('should return multiple matches for multiple parameters', () => {
		const result = matchTypeAnnotations('func f(p: Player, e: Enemy):');

		expect(result).toEqual(['Player', 'Enemy']);
	});

	it('should return an empty array when no annotations are present', () => {
		const result = matchTypeAnnotations('var x = 5');

		expect(result).toEqual([]);
	});

	it('should require a word character before the colon', () => {
		const result = matchTypeAnnotations(': Player');

		expect(result).toEqual([]);
	});
});

describe('matchReturnType', () => {
	it('should match a return type after the arrow operator', () => {
		const result = matchReturnType('func f() -> Player:');

		expect(result).toBe('Player');
	});

	it('should match a return type with no space after the arrow', () => {
		const result = matchReturnType('func f() ->Player:');

		expect(result).toBe('Player');
	});

	it('should return null when no return type is present', () => {
		const result = matchReturnType('func f():');

		expect(result).toBeNull();
	});

	it('should return null when the return type starts with lowercase', () => {
		const result = matchReturnType('-> int');

		expect(result).toBeNull();
	});
});
