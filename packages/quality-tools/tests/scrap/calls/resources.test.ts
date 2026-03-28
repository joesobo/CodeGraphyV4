import { describe, expect, it } from 'vitest';
import { isTempResourceCallName } from '../../../src/scrap/calls/resources';

describe('resources', () => {
  it('recognizes tracked temp-resource helpers', () => {
    expect(isTempResourceCallName('mkdirSync')).toBe(true);
    expect(isTempResourceCallName('writeFileSync')).toBe(true);
    expect(isTempResourceCallName('tmpdir')).toBe(true);
  });

  it('ignores undefined and unrelated call names', () => {
    expect(isTempResourceCallName(undefined)).toBe(false);
    expect(isTempResourceCallName('render')).toBe(false);
  });

  describe('mutation killers for resources.ts', () => {
    it('kills mutation: undefined check is necessary', () => {
      // callName !== undefined is essential; if mutated to === undefined would reverse result
      expect(isTempResourceCallName(undefined)).toBe(false);
    });

    it('kills mutation: true condition when callName is defined', () => {
      // Verify defined strings are checked against Set
      expect(isTempResourceCallName('mkdtemp')).toBe(true);
      expect(isTempResourceCallName('mkdir')).toBe(true);
      expect(isTempResourceCallName('writeFile')).toBe(true);
    });

    it('kills mutation: logical AND is required not OR', () => {
      // If mutated to ||, undefined would be returned as undefined (falsy) and short-circuit
      // Test that both conditions must be true
      expect(isTempResourceCallName(undefined)).toBe(false); // First part fails
      expect(isTempResourceCallName('unknown')).toBe(false); // Second part fails
    });

    it('kills mutation: Set.has() is called correctly', () => {
      // All known temp resource calls return true
      const tempCalls = ['mkdtemp', 'mkdtempSync', 'mkdir', 'mkdirSync', 'tmpdir', 'writeFile', 'writeFileSync'];
      tempCalls.forEach((call) => {
        expect(isTempResourceCallName(call)).toBe(true);
      });
    });

    it('kills mutation: untracked call names return false', () => {
      // Calls not in the Set should return false
      expect(isTempResourceCallName('readFile')).toBe(false);
      expect(isTempResourceCallName('mkdir_notreal')).toBe(false);
      expect(isTempResourceCallName('')).toBe(false);
    });
  });
});
