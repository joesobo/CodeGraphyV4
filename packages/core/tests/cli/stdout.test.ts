import { describe, expect, it, vi } from 'vitest';
import { handleCliStdoutError } from '../../src/cli/stdout';

describe('cli/stdout', () => {
  it('exits successfully when the downstream pipe closes', () => {
    const exit = vi.fn();

    handleCliStdoutError(Object.assign(new Error('broken pipe'), { code: 'EPIPE' }), exit);

    expect(exit).toHaveBeenCalledWith(0);
  });

  it('rethrows stdout errors other than a broken pipe', () => {
    expect(() => handleCliStdoutError(new Error('write failed'), vi.fn())).toThrow('write failed');
  });
});
