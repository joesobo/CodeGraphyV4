/**
 * @fileoverview Tests for Python ImportDetector.
 */

import { describe, it, expect } from 'vitest';
import { ImportDetector } from '../../../src/plugins/python/ImportDetector';

describe('Python ImportDetector', () => {
  const detector = new ImportDetector();

  describe('import statements', () => {
    it('should detect simple import', () => {
      const imports = detector.detect('import os');
      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        module: 'os',
        isRelative: false,
        type: 'import',
      });
    });

    it('should detect import with alias', () => {
      const imports = detector.detect('import numpy as np');
      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        module: 'numpy',
        isRelative: false,
        type: 'import',
      });
    });

    it('should detect multiple imports on one line', () => {
      const imports = detector.detect('import os, sys, re');
      expect(imports).toHaveLength(3);
      expect(imports.map(i => i.module)).toEqual(['os', 'sys', 're']);
    });

    it('should detect dotted module imports', () => {
      const imports = detector.detect('import os.path');
      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        module: 'os.path',
        isRelative: false,
      });
    });

    it('should detect deeply nested module imports', () => {
      const imports = detector.detect('import mypackage.subpackage.module');
      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        module: 'mypackage.subpackage.module',
      });
    });
  });

  describe('from import statements', () => {
    it('should detect from import', () => {
      const imports = detector.detect('from os import path');
      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        module: 'os',
        names: ['path'],
        isRelative: false,
        type: 'from',
      });
    });

    it('should detect from import with multiple names', () => {
      const imports = detector.detect('from typing import List, Dict, Optional');
      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        module: 'typing',
        names: ['List', 'Dict', 'Optional'],
      });
    });

    it('should detect from import with alias', () => {
      const imports = detector.detect('from collections import defaultdict as dd');
      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        module: 'collections',
        names: ['defaultdict'],
      });
    });

    it('should detect wildcard import', () => {
      const imports = detector.detect('from os.path import *');
      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        module: 'os.path',
        names: ['*'],
      });
    });

    it('should detect from import from submodule', () => {
      const imports = detector.detect('from mypackage.utils import helper');
      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        module: 'mypackage.utils',
        names: ['helper'],
      });
    });
  });

  describe('relative imports', () => {
    it('should detect single dot relative import', () => {
      const imports = detector.detect('from . import utils');
      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        module: '',
        names: ['utils'],
        isRelative: true,
        relativeLevel: 1,
      });
    });

    it('should detect double dot relative import', () => {
      const imports = detector.detect('from .. import config');
      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        module: '',
        names: ['config'],
        isRelative: true,
        relativeLevel: 2,
      });
    });

    it('should detect relative import from module', () => {
      const imports = detector.detect('from .utils import helper');
      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        module: 'utils',
        names: ['helper'],
        isRelative: true,
        relativeLevel: 1,
      });
    });

    it('should detect parent relative import from module', () => {
      const imports = detector.detect('from ..helpers import format_date');
      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        module: 'helpers',
        names: ['format_date'],
        isRelative: true,
        relativeLevel: 2,
      });
    });

    it('should detect triple dot relative import', () => {
      const imports = detector.detect('from ...shared import constants');
      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        module: 'shared',
        names: ['constants'],
        isRelative: true,
        relativeLevel: 3,
      });
    });
  });

  describe('multi-line imports', () => {
    it('should detect multi-line import with parentheses', () => {
      const code = `from typing import (
    List,
    Dict,
    Optional,
)`;
      const imports = detector.detect(code);
      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        module: 'typing',
        names: ['List', 'Dict', 'Optional'],
      });
    });

    it('should detect multi-line import with trailing comma', () => {
      const code = `from collections import (
    OrderedDict,
    defaultdict,
    Counter,
)`;
      const imports = detector.detect(code);
      expect(imports).toHaveLength(1);
      expect(imports[0].names).toEqual(['OrderedDict', 'defaultdict', 'Counter']);
    });
  });

  describe('edge cases', () => {
    it('should ignore comments', () => {
      const code = `# import fake
import real`;
      const imports = detector.detect(code);
      expect(imports).toHaveLength(1);
      expect(imports[0].module).toBe('real');
    });

    it('should handle empty content', () => {
      const imports = detector.detect('');
      expect(imports).toHaveLength(0);
    });

    it('should handle content with no imports', () => {
      const code = `def main():
    print("Hello")

if __name__ == "__main__":
    main()`;
      const imports = detector.detect(code);
      expect(imports).toHaveLength(0);
    });

    it('should track line numbers', () => {
      const code = `import os
import sys

from typing import List`;
      const imports = detector.detect(code);
      expect(imports[0].line).toBe(1);
      expect(imports[1].line).toBe(2);
      expect(imports[2].line).toBe(4);
    });

    it('should handle inline comments after imports', () => {
      const imports = detector.detect('from os import path  # file path utils');
      expect(imports).toHaveLength(1);
      expect(imports[0].names).toEqual(['path']);
    });
  });

  describe('real-world examples', () => {
    it('should parse typical Python file imports', () => {
      const code = `#!/usr/bin/env python3
"""Module docstring."""

import os
import sys
from pathlib import Path
from typing import List, Optional

from .utils import helper
from ..config import settings

import numpy as np
from collections import defaultdict, OrderedDict

def main():
    pass
`;
      const imports = detector.detect(code);
      expect(imports.length).toBeGreaterThanOrEqual(8);
      
      // Check specific imports
      const modules = imports.map(i => i.module);
      expect(modules).toContain('os');
      expect(modules).toContain('sys');
      expect(modules).toContain('pathlib');
      expect(modules).toContain('typing');
      expect(modules).toContain('numpy');
    });
  });
});
