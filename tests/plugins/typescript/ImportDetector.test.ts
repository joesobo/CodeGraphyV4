import { describe, it, expect } from 'vitest';
import { ImportDetector } from '../../../src/plugins/typescript/ImportDetector';

describe('ImportDetector', () => {
  let detector: ImportDetector;

  beforeEach(() => {
    detector = new ImportDetector();
  });

  describe('ES6 static imports', () => {
    it('should detect default import', () => {
      const code = `import React from 'react';`;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('react');
      expect(imports[0].type).toBe('static');
    });

    it('should detect named imports', () => {
      const code = `import { useState, useEffect } from 'react';`;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('react');
    });

    it('should detect namespace import', () => {
      const code = `import * as React from 'react';`;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('react');
    });

    it('should detect side-effect import', () => {
      const code = `import './styles.css';`;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('./styles.css');
    });

    it('should detect mixed import', () => {
      const code = `import React, { useState } from 'react';`;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('react');
    });

    it('should detect multiple imports', () => {
      const code = `
        import React from 'react';
        import { render } from 'react-dom';
        import './index.css';
      `;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(3);
      expect(imports.map((i) => i.specifier)).toEqual([
        'react',
        'react-dom',
        './index.css',
      ]);
    });

    it('should detect relative imports', () => {
      const code = `
        import utils from './utils';
        import helper from '../helpers/helper';
      `;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(2);
      expect(imports[0].specifier).toBe('./utils');
      expect(imports[1].specifier).toBe('../helpers/helper');
    });

    it('should detect scoped package imports', () => {
      const code = `import { Button } from '@mui/material';`;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('@mui/material');
    });
  });

  describe('CommonJS require', () => {
    it('should detect require call', () => {
      const code = `const fs = require('fs');`;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('fs');
      expect(imports[0].type).toBe('require');
    });

    it('should detect destructured require', () => {
      const code = `const { readFile } = require('fs');`;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('fs');
    });

    it('should detect inline require', () => {
      const code = `const data = require('./data.json').default;`;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('./data.json');
    });
  });

  describe('dynamic imports', () => {
    it('should detect dynamic import', () => {
      const code = `const module = await import('./module');`;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('./module');
      expect(imports[0].type).toBe('dynamic');
    });

    it('should detect dynamic import with then', () => {
      const code = `import('./module').then(m => m.default);`;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('./module');
    });
  });

  describe('re-exports', () => {
    it('should detect re-export all', () => {
      const code = `export * from './utils';`;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('./utils');
      expect(imports[0].type).toBe('reexport');
    });

    it('should detect named re-export', () => {
      const code = `export { foo, bar } from './utils';`;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('./utils');
      expect(imports[0].type).toBe('reexport');
    });

    it('should detect re-export with rename', () => {
      const code = `export { foo as default } from './utils';`;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('./utils');
    });
  });

  describe('edge cases', () => {
    it('should NOT detect imports in comments', () => {
      const code = `
        // import fake from 'not-real';
        /* import another from 'also-not-real'; */
        import real from 'real-module';
      `;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('real-module');
    });

    it('should NOT detect imports in strings', () => {
      const code = `
        const str = "import fake from 'not-real'";
        const template = \`import another from 'also-not-real'\`;
        import real from 'real-module';
      `;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('real-module');
    });

    it('should handle empty file', () => {
      const imports = detector.detect('');
      expect(imports).toHaveLength(0);
    });

    it('should handle file with no imports', () => {
      const code = `
        const x = 1;
        function hello() { return 'world'; }
        export default x;
      `;
      const imports = detector.detect(code);
      expect(imports).toHaveLength(0);
    });

    it('should include line numbers', () => {
      const code = `import foo from 'foo';
import bar from 'bar';
import baz from 'baz';`;
      const imports = detector.detect(code);

      expect(imports[0].line).toBe(1);
      expect(imports[1].line).toBe(2);
      expect(imports[2].line).toBe(3);
    });

    it('should handle multiline imports', () => {
      const code = `import {
        foo,
        bar,
        baz,
      } from 'module';`;
      const imports = detector.detect(code);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('module');
    });
  });

  describe('file types', () => {
    it('should handle .tsx files', () => {
      const code = `
        import React from 'react';
        const App = () => <div>Hello</div>;
        export default App;
      `;
      const imports = detector.detect(code, 'App.tsx');

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('react');
    });

    it('should handle .jsx files', () => {
      const code = `
        import React from 'react';
        const App = () => <div>Hello</div>;
      `;
      const imports = detector.detect(code, 'App.jsx');

      expect(imports).toHaveLength(1);
    });

    it('should handle .mjs files', () => {
      const code = `import pkg from './package.json' assert { type: 'json' };`;
      // Note: import assertions might not be fully supported
      // but the import itself should be detected
      const imports = detector.detect(code, 'index.mjs');

      expect(imports).toHaveLength(1);
      expect(imports[0].specifier).toBe('./package.json');
    });
  });
});
