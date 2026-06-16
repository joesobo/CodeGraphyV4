import { describe, expect, it } from 'vitest';
import {
  isSafeGraphViewBasename,
  isSafeGraphViewChildPath,
} from '../../../../src/extension/graphView/files/validation';

describe('graphView/files/validation', () => {
  it.each(['newfile.ts', '.env.local', 'components/Button.tsx', 'components/forms/Input.tsx'])(
    'accepts safe child paths: %j',
    (input) => {
      expect(isSafeGraphViewChildPath(input)).toBe(true);
    },
  );

  it.each([
    '../outside.ts',
    'components/../outside.ts',
    '/absolute.ts',
    'C:/outside.ts',
    'nested//file.ts',
    'nested/',
    'nested\\file.ts',
    '.',
    '..',
    '',
    '   ',
  ])('rejects unsafe child paths: %j', (input) => {
    expect(isSafeGraphViewChildPath(input)).toBe(false);
  });

  it.each(['renamed.ts', '.env.local'])('accepts safe basenames: %j', (input) => {
    expect(isSafeGraphViewBasename(input)).toBe(true);
  });

  it.each(['../outside.ts', 'nested/file.ts', 'nested\\file.ts', 'C:/outside.ts', '.', '..', '', '   '])(
    'rejects unsafe basenames: %j',
    (input) => {
      expect(isSafeGraphViewBasename(input)).toBe(false);
    },
  );
});
