import { describe, expect, it } from 'vitest';
import { isTempResourceCallName } from '../../src/scrap/tempResourceCalls';

describe('tempResourceCalls', () => {
  it('recognizes tracked temp-resource helpers', () => {
    expect(isTempResourceCallName('mkdirSync')).toBe(true);
    expect(isTempResourceCallName('writeFileSync')).toBe(true);
    expect(isTempResourceCallName('tmpdir')).toBe(true);
  });

  it('ignores undefined and unrelated call names', () => {
    expect(isTempResourceCallName(undefined)).toBe(false);
    expect(isTempResourceCallName('render')).toBe(false);
  });
});
