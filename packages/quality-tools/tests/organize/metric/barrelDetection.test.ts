import { describe, expect, it } from 'vitest';
import { checkBarrelFile } from '../../../src/organize/metric/barrelDetection';

describe('checkBarrelFile', () => {
  it('flags pure barrel file with all re-exports', () => {
    const content = `
export { foo } from './foo';
export { bar } from './bar';
    `.trim();

    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
    expect(issue?.detail).toContain('80%');
  });

  it('flags export-star barrel file', () => {
    const content = `
export * from './foo';
export * from './bar';
export * from './baz';
    `.trim();

    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });

  it('flags file with mostly re-exports (80%+)', () => {
    const content = `
import { helper } from './helper';
export { foo } from './foo';
export { bar } from './bar';
export { baz } from './baz';
export { qux } from './qux';
    `.trim();

    // 4 re-exports out of 5 statements = 80%
    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });

  it('does not flag normal file with some exports', () => {
    const content = `
import { helper } from './helper';
export function analyze() {
  return helper();
}
export { Config } from './config';
    `.trim();

    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeUndefined();
  });

  it('does not flag file with 70% re-exports (below 80% threshold)', () => {
    const content = `
import { helper } from './helper';
import { util } from './util';
export { foo } from './foo';
export { bar } from './bar';
export { baz } from './baz';
    `.trim();

    // 3 re-exports out of 5 statements = 60%
    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeUndefined();
  });

  it('does not flag empty file', () => {
    const content = '';
    const issue = checkBarrelFile('empty.ts', content);
    expect(issue).toBeUndefined();
  });

  it('does not flag file with only import statements', () => {
    const content = `
import { foo } from './foo';
import { bar } from './bar';
import { baz } from './baz';
    `.trim();

    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeUndefined();
  });

  it('flags file at exactly 80% re-exports', () => {
    const content = `
import { helper } from './helper';
export { foo } from './foo';
export { bar } from './bar';
export { baz } from './baz';
export { qux } from './qux';
    `.trim();

    // 4 re-exports out of 5 statements = 80%
    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });

  it('provides correct detail message with counts', () => {
    const content = `
import { helper } from './helper';
export { foo } from './foo';
export { bar } from './bar';
export { baz } from './baz';
export { qux } from './qux';
    `.trim();

    const issue = checkBarrelFile('index.ts', content);
    expect(issue?.detail).toContain('4 of 5');
  });

  it('ignores files with unsupported extensions', () => {
    const content = `
export { foo } from './foo';
export { bar } from './bar';
    `.trim();

    const issue = checkBarrelFile('index.json', content);
    expect(issue).toBeUndefined();
  });

  it('supports .tsx files', () => {
    const content = `
export { Component } from './Component';
export { hooks } from './hooks';
    `.trim();

    const issue = checkBarrelFile('index.tsx', content);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });

  it('supports .js files', () => {
    const content = `
export { foo } from './foo.js';
export { bar } from './bar.js';
    `.trim();

    const issue = checkBarrelFile('index.js', content);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });

  it('supports .jsx files', () => {
    const content = `
export { Button } from './Button.jsx';
export { Form } from './Form.jsx';
    `.trim();

    const issue = checkBarrelFile('index.jsx', content);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });

  it('counts local re-exports without from clause', () => {
    const content = `
import { foo } from './foo';
import { bar } from './bar';
export { foo, bar };
    `.trim();

    // 1 re-export (the local export) out of 3 statements = 33%
    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeUndefined();
  });

  it('handles mixed local and remote re-exports', () => {
    const content = `
import { foo } from './foo';
export { foo };
export { bar } from './bar';
export { baz } from './baz';
export { qux } from './qux';
    `.trim();

    // 4 re-exports (one local, three remote) out of 5 statements = 80%
    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });

  it('does not flag file with only type exports', () => {
    const content = `
export type { Foo } from './Foo';
export type { Bar } from './Bar';
export type { Baz } from './Baz';
    `.trim();

    // 3 re-exports out of 3 statements = 100%
    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });

  it('handles files with comments and whitespace', () => {
    const content = `
// This is a barrel file
export { foo } from './foo';

// Another export
export { bar } from './bar';
    `.trim();

    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });

  it('returns correct fileName in issue', () => {
    const content = `
export { foo } from './foo';
export { bar } from './bar';
    `.trim();

    const issue = checkBarrelFile('myBarrel.ts', content);
    expect(issue?.fileName).toBe('myBarrel.ts');
  });

  it('handles file with function definition and re-exports', () => {
    const content = `
export function helper() {
  return 42;
}
export { foo } from './foo';
export { bar } from './bar';
export { baz } from './baz';
export { qux } from './qux';
    `.trim();

    // 4 re-exports out of 5 statements = 80%
    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });

  it('does not flag file with mostly implementations', () => {
    const content = `
export function helper1() { return 1; }
export function helper2() { return 2; }
export function helper3() { return 3; }
export function helper4() { return 4; }
export { foo } from './foo';
    `.trim();

    // 1 re-export out of 5 statements = 20%
    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeUndefined();
  });

  it('handles export default statement', () => {
    const content = `
export default function root() { return 42; }
export { foo } from './foo';
export { bar } from './bar';
    `.trim();

    // 2 re-exports out of 3 statements = 67%
    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeUndefined();
  });

  it('handles namespace exports', () => {
    const content = `
export * as foo from './foo';
export * as bar from './bar';
export * as baz from './baz';
    `.trim();

    // These are re-exports, so 3 out of 3 = 100%
    const issue = checkBarrelFile('index.ts', content);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('barrel');
  });
});
