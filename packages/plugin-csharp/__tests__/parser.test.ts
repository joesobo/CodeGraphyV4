/**
 * @fileoverview Tests for C# parser utilities.
 */

import { describe, it, expect } from 'vitest';
import { parseContent, extractUsedTypes } from '../src/parser';

describe('C# parser', () => {
  describe('parseContent – using directives', () => {
    it('should detect simple using', () => {
      const { usings } = parseContent('using System;');
      expect(usings).toHaveLength(1);
      expect(usings[0]).toMatchObject({
        namespace: 'System',
        isStatic: false,
        isGlobal: false,
      });
    });

    it('should detect nested namespace using', () => {
      const { usings } = parseContent('using System.Collections.Generic;');
      expect(usings).toHaveLength(1);
      expect(usings[0].namespace).toBe('System.Collections.Generic');
    });

    it('should detect multiple usings', () => {
      const code = `using System;
using System.Linq;
using System.Collections.Generic;`;
      const { usings } = parseContent(code);
      expect(usings).toHaveLength(3);
      expect(usings.map(u => u.namespace)).toEqual([
        'System',
        'System.Linq',
        'System.Collections.Generic',
      ]);
    });

    it('should detect using static', () => {
      const { usings } = parseContent('using static System.Math;');
      expect(usings).toHaveLength(1);
      expect(usings[0]).toMatchObject({
        namespace: 'System.Math',
        isStatic: true,
        isGlobal: false,
      });
    });

    it('should detect global using', () => {
      const { usings } = parseContent('global using System;');
      expect(usings).toHaveLength(1);
      expect(usings[0]).toMatchObject({
        namespace: 'System',
        isStatic: false,
        isGlobal: true,
      });
    });

    it('should detect global using static', () => {
      const { usings } = parseContent('global using static System.Console;');
      expect(usings).toHaveLength(1);
      expect(usings[0]).toMatchObject({
        namespace: 'System.Console',
        isStatic: true,
        isGlobal: true,
      });
    });

    it('should detect using alias', () => {
      const { usings } = parseContent('using Json = Newtonsoft.Json;');
      expect(usings).toHaveLength(1);
      expect(usings[0]).toMatchObject({
        namespace: 'Newtonsoft.Json',
        alias: 'Json',
        isStatic: false,
      });
    });

    it('should track line numbers', () => {
      const code = `using System;

using System.Linq;`;
      const { usings } = parseContent(code);
      expect(usings[0].line).toBe(1);
      expect(usings[1].line).toBe(3);
    });
  });

  describe('parseContent – namespace declarations', () => {
    it('should detect block-scoped namespace', () => {
      const { namespaces } = parseContent('namespace MyApp.Services {');
      expect(namespaces).toHaveLength(1);
      expect(namespaces[0]).toMatchObject({
        name: 'MyApp.Services',
        isFileScoped: false,
      });
    });

    it('should detect file-scoped namespace', () => {
      const { namespaces } = parseContent('namespace MyApp.Services;');
      expect(namespaces).toHaveLength(1);
      expect(namespaces[0]).toMatchObject({
        name: 'MyApp.Services',
        isFileScoped: true,
      });
    });

    it('should detect namespace without brace on same line', () => {
      const { namespaces } = parseContent('namespace MyApp.Services\n{');
      expect(namespaces).toHaveLength(1);
      expect(namespaces[0].name).toBe('MyApp.Services');
    });
  });

  describe('parseContent – comments', () => {
    it('should ignore single-line comments', () => {
      const code = `// using System;
using System.Linq;`;
      const { usings } = parseContent(code);
      expect(usings).toHaveLength(1);
      expect(usings[0].namespace).toBe('System.Linq');
    });

    it('should ignore multi-line comments', () => {
      const code = `/* using System; */
using System.Linq;`;
      const { usings } = parseContent(code);
      expect(usings).toHaveLength(1);
      expect(usings[0].namespace).toBe('System.Linq');
    });

    it('should handle multi-line comment spanning lines', () => {
      const code = `/*
using System;
*/
using System.Linq;`;
      const { usings } = parseContent(code);
      expect(usings).toHaveLength(1);
      expect(usings[0].namespace).toBe('System.Linq');
    });

    it('should ignore inline comments', () => {
      const code = `using System; // core namespace`;
      const { usings } = parseContent(code);
      expect(usings).toHaveLength(1);
      expect(usings[0].namespace).toBe('System');
    });
  });

  describe('parseContent – real-world examples', () => {
    it('should parse typical C# file header', () => {
      const code = `using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using MyApp.Models;
using MyApp.Services;

namespace MyApp.Controllers;

public class HomeController
{
}`;
      const { usings, namespaces } = parseContent(code);

      expect(usings).toHaveLength(7);
      expect(usings.map(u => u.namespace)).toContain('System');
      expect(usings.map(u => u.namespace)).toContain('MyApp.Models');
      expect(usings.map(u => u.namespace)).toContain('MyApp.Services');

      expect(namespaces).toHaveLength(1);
      expect(namespaces[0].name).toBe('MyApp.Controllers');
      expect(namespaces[0].isFileScoped).toBe(true);
    });

    it('should handle GlobalUsings.cs pattern', () => {
      const code = `global using System;
global using System.Collections.Generic;
global using System.Linq;
global using Microsoft.Extensions.DependencyInjection;`;

      const { usings } = parseContent(code);
      expect(usings).toHaveLength(4);
      expect(usings.every(u => u.isGlobal)).toBe(true);
    });
  });

  describe('parseContent – edge cases', () => {
    it('should handle empty content', () => {
      const { usings, namespaces } = parseContent('');
      expect(usings).toHaveLength(0);
      expect(namespaces).toHaveLength(0);
    });

    it('should handle content with no usings', () => {
      const code = `namespace MyApp;

public class Program
{
    public static void Main() { }
}`;
      const { usings, namespaces } = parseContent(code);
      expect(usings).toHaveLength(0);
      expect(namespaces).toHaveLength(1);
    });
  });

  describe('extractUsedTypes', () => {
    it('should detect new expressions', () => {
      const types = extractUsedTypes('var x = new UserService(config);');
      expect(types.has('UserService')).toBe(true);
    });

    it('should detect static access', () => {
      const types = extractUsedTypes('ApiService.CallEndpoint();');
      expect(types.has('ApiService')).toBe(true);
    });

    it('should detect inheritance', () => {
      const types = extractUsedTypes('public class Foo : BaseService');
      expect(types.has('BaseService')).toBe(true);
    });

    it('should detect generic type arguments', () => {
      const types = extractUsedTypes('List<UserModel> users;');
      expect(types.has('UserModel')).toBe(true);
    });

    it('should detect type declarations', () => {
      const types = extractUsedTypes('ApiService service = new ApiService();');
      expect(types.has('ApiService')).toBe(true);
    });

    it('should ignore types inside comments', () => {
      const types = extractUsedTypes('// var x = new FakeType()\nvar y = new RealType();');
      expect(types.has('FakeType')).toBe(false);
      expect(types.has('RealType')).toBe(true);
    });

    it('should ignore types inside strings', () => {
      const types = extractUsedTypes('var msg = "new FakeType()";');
      expect(types.has('FakeType')).toBe(false);
    });

    it('should return empty set for empty content', () => {
      const types = extractUsedTypes('');
      expect(types.size).toBe(0);
    });
  });
});
