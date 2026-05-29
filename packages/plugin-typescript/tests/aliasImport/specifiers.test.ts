import { describe, expect, it } from 'vitest';
import { extractModuleSpecifiers } from '../../src/aliasImport/specifiers';

describe('TypeScript Alias Import module specifier extraction', () => {
  it('extracts only string module specifiers from TypeScript import syntax', () => {
    const source = [
      "import { a } from '@/a';",
      "export { b } from '@/b';",
      "import c = require('@/c');",
      "const d = await import('@/d');",
      'const ignored = await import(alias);',
      "const alsoIgnored = call('@/not-a-module-call');",
      "const literal = '@/not-a-module';",
    ].join('\n');

    expect(extractModuleSpecifiers('/repo/src/app.ts', source)).toEqual([
      '@/a',
      '@/b',
      '@/c',
      '@/d',
    ]);
  });

  it('parses TSX files without treating JSX text as module specifiers', () => {
    const source = [
      "import { Button } from '@/button';",
      "export const App = () => <Button label=\"@/not-a-module\" />;",
    ].join('\n');

    expect(extractModuleSpecifiers('/repo/src/app.tsx', source)).toEqual(['@/button']);
  });
});
