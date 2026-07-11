import { describe, expect, it } from 'vitest';
import {
  existingNameError,
  resolveCollisionName,
} from '../../../../src/extension/actions/clipboardFiles/collision';

describe('actions/clipboardFiles/collision', () => {
  it('keeps the original name when no sibling collides', () => {
    expect(resolveCollisionName('app.ts', ['other.ts'])).toBe('app.ts');
  });

  it('increments Explorer-style copy suffixes for files', () => {
    const siblings = ['app.ts', 'app copy.ts', 'app copy 2.ts'];

    expect(resolveCollisionName('app.ts', siblings)).toBe('app copy 3.ts');
  });

  it('produces each Explorer copy suffix in sequence', () => {
    const siblings = ['app.ts'];

    const first = resolveCollisionName('app.ts', siblings);
    siblings.push(first);
    const second = resolveCollisionName('app.ts', siblings);
    siblings.push(second);

    expect([first, second, resolveCollisionName('app.ts', siblings)]).toEqual([
      'app copy.ts',
      'app copy 2.ts',
      'app copy 3.ts',
    ]);
  });

  it('increments Explorer-style copy suffixes for extensionless names', () => {
    const siblings = ['assets', 'assets copy', 'assets copy 2'];

    expect(resolveCollisionName('assets', siblings)).toBe('assets copy 3');
  });

  it('preserves only the final extension for multi-dot names', () => {
    expect(resolveCollisionName('app.test.ts', ['app.test.ts'])).toBe('app.test copy.ts');
  });

  it('treats dotfiles as extensionless names', () => {
    expect(resolveCollisionName('.env', ['.env'])).toBe('.env copy');
  });

  it('matches sibling names case-sensitively', () => {
    expect(resolveCollisionName('App.ts', ['app.ts'])).toBe('App.ts');
  });

  it('uses the Explorer-equivalent existing-name error shape', () => {
    expect(existingNameError('app.ts').message).toBe(
      'A file or folder **app.ts** already exists at this location. Please choose a different name.',
    );
  });
});
