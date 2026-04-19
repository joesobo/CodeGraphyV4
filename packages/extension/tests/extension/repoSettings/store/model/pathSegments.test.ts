import { describe, expect, it } from 'vitest';
import { getPathSegments } from '../../../../../src/extension/repoSettings/store/model/pathSegments';

describe('extension/repoSettings/store/model/pathSegments', () => {
  it('splits normalized keys into non-empty path segments', () => {
    expect(getPathSegments('legend.0.pattern')).toEqual(['legend', '0', 'pattern']);
    expect(getPathSegments('.timeline..playbackSpeed.')).toEqual(['timeline', 'playbackSpeed']);
    expect(getPathSegments('')).toEqual([]);
  });
});
