import { describe, it, expect } from 'vitest';
import {
  matchStaticAccess,
  matchIsAs,
  matchGenerics,
} from '../src/sources/class-name-expressions';

describe('matchStaticAccess', () => {
  it('should match uppercase class before dot access', () => {
    const result = matchStaticAccess('Player.new()');

    expect(result).toEqual(['Player']);
  });

  it('should match class name with space before dot', () => {
    const result = matchStaticAccess('Player .new()');

    expect(result).toEqual(['Player']);
  });

  it('should return multiple matches for multiple static accesses', () => {
    const result = matchStaticAccess('Player.new() + Enemy.spawn()');

    expect(result).toEqual(['Player', 'Enemy']);
  });

  it('should return empty for lowercase identifier before dot', () => {
    const result = matchStaticAccess('node.call()');

    expect(result).toEqual([]);
  });

  it('should return empty when there is no dot access', () => {
    const result = matchStaticAccess('var x = Player');

    expect(result).toEqual([]);
  });
});

describe('matchIsAs', () => {
  it('should match class name after is keyword', () => {
    const result = matchIsAs('if x is Player:');

    expect(result).toEqual(['Player']);
  });

  it('should match class name after as keyword', () => {
    const result = matchIsAs('var y = x as Player');

    expect(result).toEqual(['Player']);
  });

  it('should handle multiple spaces between keyword and class name', () => {
    const result = matchIsAs('if x is  Player:');

    expect(result).toEqual(['Player']);
  });

  it('should return multiple matches for both is and as in one line', () => {
    const result = matchIsAs('x is Player and y as Enemy');

    expect(result).toEqual(['Player', 'Enemy']);
  });

  it('should return empty for lowercase type after is', () => {
    const result = matchIsAs('is int');

    expect(result).toEqual([]);
  });

  it('should return empty when there is no is or as keyword', () => {
    const result = matchIsAs('var x = Player.new()');

    expect(result).toEqual([]);
  });
});

describe('matchGenerics', () => {
  it('should match single type parameter in brackets', () => {
    const result = matchGenerics('Array[Player]');

    expect(result).toEqual(['Player']);
  });

  it('should match both type parameters with comma and space', () => {
    const result = matchGenerics('Dictionary[String, Value]');

    expect(result).toEqual(['String', 'Value']);
  });

  it('should match both type parameters with comma and no space', () => {
    const result = matchGenerics('Dictionary[String,Value]');

    expect(result).toEqual(['String', 'Value']);
  });

  it('should return empty when there are no generics', () => {
    const result = matchGenerics('var x = Player.new()');

    expect(result).toEqual([]);
  });

  it('should return empty when second param is lowercase', () => {
    const result = matchGenerics('Dictionary[Key, value]');

    expect(result).toEqual([]);
  });
});
