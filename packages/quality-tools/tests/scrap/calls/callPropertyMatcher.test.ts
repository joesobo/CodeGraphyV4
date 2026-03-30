import { describe, expect, it } from 'vitest';
import { hasPropertyName, matchesTerminalName } from '../../../src/scrap/calls/propertyMatcher';
import { selectVitestCall } from './helpers/vitestCallTestSupport';

describe('callPropertyMatcher', () => {
  it('returns false for identifier expressions and true for matching property access chains', () => {
    const identifierCall = selectVitestCall(`concurrent('case', () => {});`, () => true);
    const propertyCall = selectVitestCall(`describe.skip.concurrent('suite', () => {});`, () => true);

    expect(hasPropertyName(identifierCall.expression, 'concurrent')).toBe(false);
    expect(hasPropertyName(propertyCall.expression, 'concurrent')).toBe(true);
    expect(hasPropertyName(propertyCall.expression, 'skip')).toBe(true);
  });

  it('walks through nested call expressions and returns false when no property matches', () => {
    const nestedCall = selectVitestCall(`buildSuite().concurrent.each([[1]])('case', () => {});`, () => true);
    const unrelatedCall = selectVitestCall(`buildSuite().serial('case', () => {});`, () => true);

    expect(hasPropertyName(nestedCall.expression, 'concurrent')).toBe(true);
    expect(hasPropertyName(unrelatedCall.expression, 'concurrent')).toBe(false);
  });

  it('matches only the terminal property name when one exists', () => {
    const snapshotCall = selectVitestCall(`expect(value).toMatchSnapshot();`, () => true);
    const helperCall = selectVitestCall(`resolveMatcher()();`, () => true);

    expect(matchesTerminalName(snapshotCall.expression, new Set(['toMatchSnapshot']))).toBe(true);
    expect(matchesTerminalName(snapshotCall.expression, new Set(['toBe']))).toBe(false);
    expect(matchesTerminalName(helperCall.expression, new Set(['toMatchSnapshot']))).toBe(false);
  });
});
