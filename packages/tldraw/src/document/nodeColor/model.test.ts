import { describe, expect, it } from 'vitest';
import { resolveNativeNodeColor } from './model';

describe('tldraw node color', () => {
  it('translates resolved graph colors into native tldraw colors', () => {
    expect(resolveNativeNodeColor('#93C5FD')).toBe('blue');
    expect(resolveNativeNodeColor('#67e8f9')).toBe('light-blue');
    expect(resolveNativeNodeColor('#FDE68A')).toBe('yellow');
    expect(resolveNativeNodeColor('#86EFAC')).toBe('light-green');
    expect(resolveNativeNodeColor('#A1A1AA')).toBe('grey');
    expect(resolveNativeNodeColor('#123456')).toBe('grey');
  });
});
